import { Board } from "./flipEngine";
import { sanitize } from "./chars";
import { tick } from "./sound";
import type { Config } from "./config";

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

function buildSepCols(str: string): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i < str.length; i++) if (str[i] === ":") set.add(i);
  return set;
}

// ---------- Clock ----------
function clockString(format: "12" | "24", seconds: boolean): string {
  const d = new Date();
  let h = d.getHours();
  let suffix = "";
  if (format === "12") {
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

export function renderCountdown(
  board: Board,
  cd: Pick<Config, "cdEnd" | "cdDuration" | "cdDone">,
  setCaption: SetCaption,
  onFinish: () => void,
  sound: boolean
): void {
  if (!cd.cdEnd) {
    const str = countdownString(cd.cdDuration);
    board.setLayout([str], buildSepCols(str));
    board.render([str]);
    setCaption("", ""); // no instructional text
    return;
  }
  const remaining = (cd.cdEnd - Date.now()) / 1000;
  if (remaining <= 0) {
    const done = sanitize(cd.cdDone).trim() || "DONE";
    board.setLayout([done]);
    board.render([done], true); // flutter into the finished label
    setCaption("Finished", "");
    onFinish();
    if (sound) {
      tick();
      setTimeout(tick, 140);
      setTimeout(tick, 280);
    }
    return;
  }
  const str = countdownString(remaining);
  board.setLayout([str], buildSepCols(str));
  board.render([str]);
  const end = new Date(cd.cdEnd);
  setCaption("Until " + end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), "");
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
