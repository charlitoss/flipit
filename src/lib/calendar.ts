import type {
  CalendarErrorCode,
  CalendarRequest,
  CalendarResponse,
} from "./calendar/types";

// Calendar state deliberately lives OUTSIDE Config:
//  - the ICS URL is a bearer credential, and Config is persisted wholesale,
//    handed to every board, and fed to the share-link builder;
//  - events are async data (loading/error), not display config.
// Same spirit as the reminder settings: local only, never in a share URL.
const CAL_KEY = "flipit.cal";

export interface CalSettings {
  url: string;
  on: boolean;
  /** false → titles never leave the server ("Busy" only). For shared screens. */
  includeTitles: boolean;
}

export const DEFAULT_CAL: CalSettings = { url: "", on: false, includeTitles: true };

export function loadCal(): CalSettings {
  try {
    const raw = localStorage.getItem(CAL_KEY);
    if (!raw) return { ...DEFAULT_CAL };
    const o = JSON.parse(raw) as Partial<CalSettings>;
    return {
      url: typeof o.url === "string" ? o.url : "",
      on: !!o.on,
      includeTitles: o.includeTitles !== false,
    };
  } catch {
    return { ...DEFAULT_CAL };
  }
}

export function saveCal(s: CalSettings): void {
  try {
    localStorage.setItem(CAL_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function clearCal(): void {
  try {
    localStorage.removeItem(CAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Client-side event: ms timestamps rather than the wire's ISO strings. */
export interface CalEvent {
  id: string;
  start: number;
  end: number;
  title: string;
  allDay: boolean;
  busy: boolean;
  cancelled: boolean;
}

export type CalErrorCode = CalendarErrorCode | "unsupported" | "network";

export interface CalError {
  code: CalErrorCode;
  message: string;
  hint?: string;
  retryAfter?: number;
}

/**
 * The serverless function only exists on the Vercel deployment — the build also
 * targets file:// and GitHub Pages (vite base: "./"), where there is no /api.
 */
export function calendarSupported(): boolean {
  return typeof location !== "undefined" && location.protocol.startsWith("http");
}

/** Local-day bounds, so the server never has to guess what "today" means. */
export function dayWindow(now: number = Date.now()): { from: Date; to: Date } {
  const d = new Date(now);
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { from, to };
}

export async function fetchCalendar(
  settings: CalSettings,
  signal?: AbortSignal
): Promise<{ events: CalEvent[]; fetchedAt: number; truncated: boolean }> {
  if (!calendarSupported()) {
    throw <CalError>{
      code: "unsupported",
      message: "Calendar needs the hosted version of Flipit.",
      hint: "Open flipit-tool.vercel.app to connect a calendar.",
    };
  }
  const { from, to } = dayWindow();
  const body: CalendarRequest = {
    url: settings.url,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    from: from.toISOString(),
    to: to.toISOString(),
    includeTitles: settings.includeTitles,
  };

  let res: Response;
  try {
    // POST, not GET: the URL is a bearer credential and query strings land in
    // access logs, browser history and Referer headers.
    res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw <CalError>{
      code: "network",
      message: "Couldn’t reach Flipit’s server.",
      hint: "Check your connection and try again.",
    };
  }

  // A static host (GitHub Pages / preview without functions) answers with HTML.
  const ctype = res.headers.get("content-type") ?? "";
  if (!ctype.includes("application/json")) {
    throw <CalError>{
      code: "unsupported",
      message: "Calendar isn’t available on this deployment.",
      hint: "It needs the hosted version at flipit-tool.vercel.app.",
    };
  }

  const data = (await res.json()) as CalendarResponse;
  if (!data.ok) {
    throw <CalError>{
      code: data.error.code,
      message: data.error.message,
      hint: data.error.hint,
      retryAfter: data.error.retryAfter,
    };
  }

  return {
    events: data.events.map((e) => ({
      id: e.id,
      start: Date.parse(e.start),
      end: Date.parse(e.end),
      title: e.title,
      allDay: e.allDay,
      busy: e.busy,
      cancelled: e.status === "cancelled",
    })),
    fetchedAt: Date.parse(data.fetchedAt) || Date.now(),
    truncated: !!data.truncated,
  };
}

// ---------- Pure helpers (mirrors src/lib/reminders.ts: config in, value out) ----------

/** The busy event covering `t`, if any. */
export function eventAt(events: CalEvent[], t: number = Date.now()): CalEvent | null {
  for (const e of events) {
    if (e.busy && e.start <= t && t < e.end) return e;
  }
  return null;
}

export function isBusyAt(events: CalEvent[], t: number = Date.now()): boolean {
  return eventAt(events, t) !== null;
}

/**
 * End of the busy block covering `t`, merging back-to-back meetings so a run of
 * them yields one break at the end rather than a queue of them.
 */
export function busyUntil(events: CalEvent[], t: number = Date.now()): number {
  let end = t;
  let moved = true;
  while (moved) {
    moved = false;
    for (const e of events) {
      if (e.busy && e.start <= end && e.end > end) {
        end = e.end;
        moved = true;
      }
    }
  }
  return end;
}

/** The next event starting after `t` (ignores cancelled). */
export function nextEvent(events: CalEvent[], t: number = Date.now()): CalEvent | null {
  let best: CalEvent | null = null;
  for (const e of events) {
    if (e.cancelled || e.allDay) continue;
    if (e.start > t && (!best || e.start < best.start)) best = e;
  }
  return best;
}

/** "9:30" / "14:05" in the viewer's locale. */
export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Compact relative gap: "in 12 min", "in 2 h", "now". */
export function fmtUntil(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m <= 0) return "now";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `in ${h} h ${rem} min` : `in ${h} h`;
}
