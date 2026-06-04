import { Board } from "./flipEngine";
import { sanitize } from "./chars";
import type { Config } from "./config";

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

// Columns rendered as transparent spacers (no flip card): the ":" separators
// and any spaces (e.g. the gap before AM/PM).
function buildSepCols(str: string): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ":" || str[i] === " ") set.add(i);
  }
  return set;
}

// ---------- Clock ----------
function clockString(format: "12" | "24", seconds: boolean): string {
  const d = new Date();
  let h = d.getHours();
  let suffix = "";
  if (format === "12") {
    // The leading space renders as a transparent spacer (see buildSepCols),
    // giving a gap before AM/PM rather than a blank flip cell.
    suffix = h >= 12 ? " PM" : " AM";
    h = h % 12;
    if (h === 0) h = 12;
  }
  let s = pad(h) + ":" + pad(d.getMinutes());
  if (seconds) s += ":" + pad(d.getSeconds());
  s += suffix;
  return s;
}

// setCaption(above, below): `above` renders over the board, `below` under it.
type SetCaption = (above: string, below: string) => void;

export function renderClock(
  board: Board,
  format: "12" | "24",
  seconds: boolean,
  setCaption: SetCaption
): void {
  const str = clockString(format, seconds);
  board.setLayout([str], buildSepCols(str));
  board.render([str]);
  const date = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  setCaption(date, ""); // date above the clock
}

// ---------- Countdown ----------
function countdownString(remainingSec: number): string {
  const r = Math.max(0, Math.floor(remainingSec));
  const days = Math.floor(r / 86400);
  const h = Math.floor((r % 86400) / 3600);
  const m = Math.floor((r % 3600) / 60);
  const s = r % 60;
  if (days > 0) return pad(days) + ":" + pad(h) + ":" + pad(m) + ":" + pad(s);
  return pad(h) + ":" + pad(m) + ":" + pad(s);
}

// Returns true once the countdown has reached zero (held at 00:00:00).
export function renderCountdown(
  board: Board,
  cd: Pick<Config, "cdEnd" | "cdDuration">,
  setCaption: SetCaption
): boolean {
  if (!cd.cdEnd) {
    // Idle (never started): preview the configured duration.
    const str = countdownString(cd.cdDuration);
    board.setLayout([str], buildSepCols(str));
    board.render([str]);
    setCaption("", "");
    return false;
  }
  const remaining = (cd.cdEnd - Date.now()) / 1000;
  const str = countdownString(remaining); // clamps to 00:00:00 at/after zero
  board.setLayout([str], buildSepCols(str));
  board.render([str]);
  if (remaining <= 0) {
    // Hold at 00:00:00 until a new countdown is started.
    setCaption("Finished", "");
    return true;
  }
  const end = new Date(cd.cdEnd);
  setCaption("Until " + end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), "");
  return false;
}

// ---------- Message ----------
export function layoutMessage(text: string): string[] {
  const raw = sanitize(text).replace(/\r/g, "");
  const lines = raw.split("\n").map((l) => l.replace(/\s+$/, ""));
  // Center each line within the widest line, clamp width.
  const width = Math.min(Math.max(1, ...lines.map((l) => l.length)), 40);
  const padded = lines.slice(0, 8).map((l) => {
    l = l.slice(0, width);
    const total = width - l.length;
    const left = Math.floor(total / 2);
    return " ".repeat(left) + l + " ".repeat(total - left);
  });
  return padded.length ? padded : [" "];
}

export function renderMessage(board: Board, message: string, setCaption: SetCaption): void {
  const lines = layoutMessage(message);
  board.setLayout(lines);
  board.render(lines, true); // airport-style flutter
  setCaption("", "");
}
