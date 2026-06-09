import type { Config } from "./config";

function toMin(hhmm: string): number {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Is the current time inside the reminder's active-hours window?
export function withinReminderWindow(c: Config, d: Date = new Date()): boolean {
  if (!c.reminderWindow) return true;
  const from = toMin(c.reminderFrom);
  const to = toMin(c.reminderTo);
  if (from === to) return true;
  const cur = d.getHours() * 60 + d.getMinutes();
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

// Milliseconds left in the current interval until the next break (>= 0).
export function nextBreakMs(c: Config, now: number = Date.now()): number {
  const every = Math.max(1, c.reminderEvery) * 60_000;
  const last = c.reminderLast || now;
  return Math.max(0, last + every - now);
}
