import { useEffect, useState } from "react";
import { eventAt, fmtTime, fmtUntil, nextEvent } from "../lib/calendar";
import type { CalendarApi } from "../hooks/useCalendar";

/**
 * The live label inside the calendar button — the trigger shows the upcoming
 * event rather than a bare icon. Same stacked label/value shape as
 * BellCountdown, which is also the pattern that keeps this out of the way on
 * mobile (a separate floating widget used to collide with the bottom controls).
 */
export default function CalendarPill({ cal }: { cal: CalendarApi }) {
  const [, tick] = useState(0);
  const live = cal.settings.on && !!cal.settings.url;
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => tick((n) => n + 1), 10_000);
    return () => window.clearInterval(id);
  }, [live]);

  if (!live) return null;

  let label = "Calendar";
  let value = "…";

  if (cal.status === "error") {
    label = "Calendar";
    value = cal.error?.code === "rate_limited" ? "Paused" : "Unavailable";
  } else if (cal.status === "ok" || cal.events.length) {
    const now = Date.now();
    const current = eventAt(cal.events, now);
    const next = nextEvent(cal.events, now);
    if (current) {
      label = "Now";
      value = current.title || "Busy";
    } else if (next) {
      label = "Next";
      value = `${next.title || "Busy"} ${fmtTime(next.start)}`;
    } else {
      label = "Today";
      value = "Clear";
    }
  }

  const current = eventAt(cal.events, Date.now());
  const next = nextEvent(cal.events, Date.now());
  const title = current
    ? `Now: ${current.title || "Busy"} until ${fmtTime(current.end)}`
    : next
      ? `Next: ${next.title || "Busy"} at ${fmtTime(next.start)} (${fmtUntil(next.start - Date.now())})`
      : "No more events today";

  return (
    <span className="cal-cd" title={title}>
      <span className="cal-cd-label">{label}</span>
      <span className="cal-cd-value">{value}</span>
    </span>
  );
}
