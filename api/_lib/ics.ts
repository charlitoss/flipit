import { createHash } from "node:crypto";
import ICAL from "ical.js";
import type { CalendarEvent } from "../../src/lib/calendar/types.js";
import { ProxyError } from "./errors.js";

const MAX_EVENTS_OUT = 500; // total occurrences returned
const MAX_ITER_PER_EVENT = 10_000; // guards FREQ=MINUTELY / no UNTIL / no COUNT
const EXPAND_BUDGET_MS = 3_000; // wall-clock ceiling for the whole expansion
const MAX_TITLE = 120;

// ---------- timezone helpers ----------

/** Offset (ms) of `tz` at a given instant. */
function offsetMs(at: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) m[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(m.year),
    Number(m.month) - 1,
    Number(m.day),
    Number(m.hour) % 24,
    Number(m.minute),
    Number(m.second)
  );
  return asUTC - at.getTime();
}

/** Wall-clock components in `tz` → UTC instant (two-pass, DST-correct). */
function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string
): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const t1 = guess - offsetMs(new Date(guess), tz);
  return guess - offsetMs(new Date(t1), tz);
}

/**
 * An ICAL.Time → UTC instant.
 *
 * Floating times (no TZID and no Z) are interpreted in the *client's* zone —
 * which is the whole reason the request carries a timeZone.
 */
function toMs(t: ICAL.Time, tz: string): number {
  if (t.isDate) return zonedToUtc(t.year, t.month, t.day, 0, 0, tz);
  const zone = t.zone;
  if (!zone || zone === ICAL.Timezone.localTimezone) {
    return zonedToUtc(t.year, t.month, t.day, t.hour, t.minute, tz) + t.second * 1000;
  }
  return t.toJSDate().getTime();
}

// ---------- normalisation ----------

function statusOf(ev: ICAL.Event): CalendarEvent["status"] {
  const raw = String(ev.component.getFirstPropertyValue("status") ?? "").toUpperCase();
  if (raw === "CANCELLED") return "cancelled";
  if (raw === "TENTATIVE") return "tentative";
  return "confirmed";
}

function transparencyOf(ev: ICAL.Event): CalendarEvent["transparency"] {
  const raw = String(ev.component.getFirstPropertyValue("transp") ?? "").toUpperCase();
  return raw === "TRANSPARENT" ? "transparent" : "opaque";
}

/**
 * The "don't interrupt me" signal.
 *
 * All-day events are deliberately NOT busy: "PTO", "WFH" and birthdays would
 * otherwise suppress break reminders for an entire day.
 */
function busyOf(
  status: CalendarEvent["status"],
  transparency: CalendarEvent["transparency"],
  allDay: boolean,
  msBusyStatus: string
): boolean {
  if (status === "cancelled") return false;
  if (transparency === "transparent") return false;
  if (allDay) return false;
  if (msBusyStatus === "FREE") return false; // Outlook hint
  return true;
}

function hashId(salt: string, uid: string, recurrenceId: string): string {
  return createHash("sha256").update(`${salt}|${uid}|${recurrenceId}`).digest("hex").slice(0, 16);
}

interface ParseOpts {
  text: string;
  tz: string;
  from: number;
  to: number;
  includeTitles: boolean;
  idSalt: string;
}

export function parseIcs(opts: ParseOpts): { events: CalendarEvent[]; truncated: boolean } {
  const { text, tz, from, to, includeTitles, idSalt } = opts;

  const head = text.replace(/^﻿/, "").trimStart().slice(0, 200).toUpperCase();
  if (!head.startsWith("BEGIN:VCALENDAR")) throw new ProxyError("not_calendar");

  let comp: ICAL.Component;
  try {
    comp = new ICAL.Component(ICAL.parse(text));
  } catch {
    throw new ProxyError("parse_failed");
  }

  // Register the file's own VTIMEZONEs so DST resolves from its rules, not a guess.
  try {
    for (const vt of comp.getAllSubcomponents("vtimezone")) {
      const tzone = new ICAL.Timezone(vt);
      if (tzone.tzid && !ICAL.TimezoneService.has(tzone.tzid)) ICAL.TimezoneService.register(tzone);
    }
  } catch {
    /* a malformed VTIMEZONE shouldn't sink the whole calendar */
  }

  // Split masters from RECURRENCE-ID overrides, grouped by UID.
  const masters: ICAL.Event[] = [];
  const overrides = new Map<string, ICAL.Event[]>();
  for (const ve of comp.getAllSubcomponents("vevent")) {
    let ev: ICAL.Event;
    try {
      ev = new ICAL.Event(ve);
    } catch {
      continue; // skip individually broken events
    }
    if (!ev.startDate) continue;
    if (ve.getFirstPropertyValue("recurrence-id")) {
      const uid = String(ev.uid ?? "");
      const list = overrides.get(uid) ?? [];
      list.push(ev);
      overrides.set(uid, list);
    } else {
      masters.push(ev);
    }
  }

  const out: CalendarEvent[] = [];
  let truncated = false;
  const deadline = Date.now() + EXPAND_BUDGET_MS;

  const emit = (ev: ICAL.Event, startMs: number, endMs: number, recurrenceId: string): void => {
    if (out.length >= MAX_EVENTS_OUT) {
      truncated = true;
      return;
    }
    const allDay = !!ev.startDate?.isDate;
    const status = statusOf(ev);
    const transparency = transparencyOf(ev);
    const ms = String(
      ev.component.getFirstPropertyValue("x-microsoft-cdo-busystatus") ?? ""
    ).toUpperCase();
    const title = includeTitles ? String(ev.summary ?? "").trim().slice(0, MAX_TITLE) : "";
    out.push({
      id: hashId(idSalt, String(ev.uid ?? ""), recurrenceId),
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      allDay,
      title,
      busy: busyOf(status, transparency, allDay, ms),
      status,
      transparency,
      recurring: recurrenceId !== "",
    });
  };

  for (const ev of masters) {
    if (Date.now() > deadline) {
      truncated = true;
      break;
    }

    // Attach this UID's overrides so expansion yields the edited instances.
    const exs = overrides.get(String(ev.uid ?? ""));
    if (exs) {
      for (const ex of exs) {
        try {
          ev.relateException(ex);
        } catch {
          /* ignore a mismatched override */
        }
      }
    }

    if (!ev.isRecurring()) {
      const s = toMs(ev.startDate, tz);
      const e = ev.endDate ? toMs(ev.endDate, tz) : s;
      if (e > from && s < to) emit(ev, s, e, "");
      continue;
    }

    // Cheap pre-filter: an RRULE that ended before the window can't contribute.
    let skip = false;
    for (const rrule of ev.component.getAllProperties("rrule")) {
      const recur = rrule.getFirstValue() as ICAL.Recur | null;
      const until = recur?.until;
      if (until && toMs(until, tz) < from) skip = true;
    }
    if (skip) continue;
    if (toMs(ev.startDate, tz) > to) continue; // series starts after the window

    let iter: ICAL.RecurExpansion;
    try {
      iter = ev.iterator();
    } catch {
      continue;
    }
    let steps = 0;
    for (let next = iter.next(); next; next = iter.next()) {
      if (++steps > MAX_ITER_PER_EVENT || Date.now() > deadline) {
        truncated = true;
        break;
      }
      let startMs: number;
      let endMs: number;
      let detailEv: ICAL.Event = ev;
      try {
        const d = ev.getOccurrenceDetails(next);
        detailEv = d.item ?? ev;
        startMs = toMs(d.startDate, tz);
        endMs = toMs(d.endDate, tz);
      } catch {
        continue;
      }
      if (startMs >= to) break; // occurrences are ordered — nothing further can match
      if (endMs > from) emit(detailEv, startMs, endMs, next.toString());
      if (out.length >= MAX_EVENTS_OUT) break;
    }
    if (out.length >= MAX_EVENTS_OUT) {
      truncated = true;
      break;
    }
  }

  out.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  return { events: out, truncated };
}
