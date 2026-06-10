import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LedChar from "./LedChar";
import { getDisplayState } from "../lib/display";
import { alarm } from "../lib/sound";
import type { Config } from "../lib/config";

// Cell metrics in em (em == board font-size == cell height).
const CHAR_W = 0.64; // matches the 64x100 char viewBox
const GAP = 0.06;
const ROW_GAP = 0.18;
const MAX_FONT = 150;

export default function LedBoard({ config, isEmbed }: { config: Config; isEmbed: boolean }) {
  const [state, setState] = useState(() => getDisplayState(config));
  const [fontSize, setFontSize] = useState(64);
  const stageRef = useRef<HTMLDivElement>(null);

  // Content loop: tick clock/countdown; fire the alarm once at zero.
  useEffect(() => {
    setState(getDisplayState(config));
    if (config.mode === "message") return;
    let sawRunning = false;
    let firedAlarm = false;
    const tick = () => {
      const s = getDisplayState(config);
      setState(s);
      if (config.mode === "countdown") {
        if (!s.atZero) sawRunning = true;
        else if (sawRunning && !firedAlarm) {
          firedAlarm = true;
          alarm();
        }
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.mode,
    config.clockFormat,
    config.clockSeconds,
    config.cdEnd,
    config.cdDuration,
    config.message,
  ]);

  // Size the board to fill the stage.
  useLayoutEffect(() => {
    const fit = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const cs = getComputedStyle(stage);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      let availW = stage.clientWidth - padX;
      let availH = stage.clientHeight - padY;
      const gap = parseFloat(cs.rowGap || cs.gap || "0") || 0;
      for (const child of Array.from(stage.children)) {
        const el = child as HTMLElement;
        if (el.classList.contains("led-board")) continue;
        availH -= el.getBoundingClientRect().height + gap;
      }
      const cols = Math.max(1, ...state.lines.map((l) => [...l].length));
      const rows = state.lines.length || 1;
      const widthPerEm = cols * CHAR_W + (cols - 1) * GAP;
      const heightPerEm = rows + (rows - 1) * ROW_GAP;
      let font = Math.min(availW / widthPerEm, availH / heightPerEm, MAX_FONT);
      setFontSize(Math.max(8, font));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [state.lines, state.caption, isEmbed]);

  return (
    <div id="stage" ref={stageRef}>
      {!isEmbed && state.caption && (
        <div id="caption-top" className="caption-seg" aria-label={state.caption}>
          {[...state.caption.toUpperCase()].map((ch, i) => (
            <span className="cap-cell" key={i}>
              <LedChar ch={ch} />
            </span>
          ))}
        </div>
      )}
      <div className="led-board" style={{ fontSize }}>
        {state.lines.map((line, i) => (
          <div className="led-row" key={i}>
            {[...line].map((ch, j) => (
              <span
                className={"led-cell" + (ch === ":" && config.mode === "clock" ? " clock-colon" : "")}
                key={j}
              >
                <LedChar ch={ch} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
