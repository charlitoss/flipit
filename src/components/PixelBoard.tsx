import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getDisplayState } from "../lib/display";
import { alignedInterval } from "../lib/clockTick";
import { alarm } from "../lib/sound";
import { pixelFamily } from "../lib/pixel";
import type { Config } from "../lib/config";

const REF = 200; // measuring font-size
const MAX_FONT = 240;
// One Geist Pixel "pixel" is ~0.0345 of the font-size (measured from the glyphs).
// Used to size the background pixel grid so it tracks the font as it scales.
const PIXEL_RATIO = 0.0345;

export default function PixelBoard({ config, isEmbed }: { config: Config; isEmbed: boolean }) {
  const [state, setState] = useState(() => getDisplayState(config));
  const [fontSize, setFontSize] = useState(80);
  const stageRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const family = pixelFamily(config.pixelVariant);
  const stack = `"${family}", monospace`;

  // Content loop (same cadence as the other boards).
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
    return alignedInterval(tick, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.mode,
    config.clockFormat,
    config.clockSeconds,
    config.cdEnd,
    config.cdDuration,
    config.message,
  ]);

  // Size the text to fill the stage by measuring a hidden copy at REF px.
  useLayoutEffect(() => {
    const fit = () => {
      const stage = stageRef.current;
      const meas = measureRef.current;
      if (!stage || !meas) return;
      const cs = getComputedStyle(stage);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      let availW = stage.clientWidth - padX;
      let availH = stage.clientHeight - padY;
      const gap = parseFloat(cs.rowGap || cs.gap || "0") || 0;
      for (const child of Array.from(stage.children)) {
        const el = child as HTMLElement;
        if (el.classList.contains("pixel-board")) continue;
        availH -= el.getBoundingClientRect().height + gap;
      }
      const w = meas.offsetWidth;
      const h = meas.offsetHeight;
      if (!w || !h) return;
      const font = Math.max(8, Math.min((availW * REF) / w, (availH * REF) / h, MAX_FONT));
      setFontSize(font);
      // Match the backdrop pixel grid to the font's pixel size as it scales.
      stage.style.setProperty("--px-bg", (font * PIXEL_RATIO).toFixed(2) + "px");
    };
    fit();
    // re-fit once the web font has loaded (metrics change)
    document.fonts?.ready?.then(fit).catch(() => {});
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [state.lines, state.caption, family, isEmbed]);

  // Clock/countdown render in a fixed cell grid so digits never shift; messages
  // keep the font's natural (proportional) spacing.
  const grid = config.mode !== "message";
  const rows = state.lines.map((line, i) =>
    grid ? (
      <div className="pixel-row grid" key={i}>
        {[...line].map((ch, j) => (
          <span
            className={
              "pixel-cell" +
              (ch === ":" || ch === " " ? " narrow" : "") +
              (ch === ":" && config.mode === "clock" ? " clock-colon" : "")
            }
            key={j}
          >
            {ch}
          </span>
        ))}
      </div>
    ) : (
      <div className="pixel-row" key={i}>
        {line || " "}
      </div>
    )
  );

  return (
    <div id="stage" ref={stageRef}>
      {!isEmbed && state.caption && (
        <div id="caption-top" className="caption-pixel" style={{ fontFamily: stack }}>
          {state.caption}
        </div>
      )}
      {/* hidden measuring copy at the reference size */}
      <div
        ref={measureRef}
        className="pixel-board pixel-measure"
        style={{ fontFamily: stack, fontSize: REF }}
        aria-hidden
      >
        {rows}
      </div>
      <div className="pixel-board" style={{ fontFamily: stack, fontSize }}>
        {rows}
      </div>
    </div>
  );
}
