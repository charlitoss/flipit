import { SEG_POLYS, litSegments } from "../lib/segments";

// One 14-segment character. ":" renders as two dots, "." as a single dot.
export default function LedChar({ ch }: { ch: string }) {
  if (ch === ":") {
    return (
      <svg className="led-char" viewBox="0 0 64 100" aria-hidden="true">
        <circle className="led-seg on" cx="32" cy="36" r="4.5" />
        <circle className="led-seg on" cx="32" cy="64" r="4.5" />
      </svg>
    );
  }

  const lit = litSegments(ch);
  const hasDot = ch === ".";
  return (
    <svg className="led-char" viewBox="0 0 64 100" aria-hidden="true">
      {SEG_POLYS.map((s) => (
        <polygon key={s.key} className={"led-seg" + (lit.has(s.key) ? " on" : "")} points={s.points} />
      ))}
      {hasDot && <circle className="led-seg on" cx="58" cy="92" r="4.5" />}
    </svg>
  );
}
