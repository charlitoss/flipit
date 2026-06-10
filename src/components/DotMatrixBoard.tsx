import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getDisplayState } from "../lib/display";
import { alarm } from "../lib/sound";
import { buildMatrix, colonMask, matrixRadius } from "../lib/dotmatrix";
import type { Config } from "../lib/config";

const GAP_RATIO = 0.2; // cell gap as a fraction of cell size
const MAX_CELL = 26;

// Renders a boolean grid as cells (lit / unlit) — the dot-matrix panel.
function MatrixGrid({
  grid,
  cell,
  radius,
  className,
  colon,
}: {
  grid: boolean[][];
  cell: number;
  radius: number; // corner radius as a fraction of the cell
  className?: string;
  colon?: boolean[][] | null; // cells belonging to a ":" glyph (blinked)
}) {
  const cols = grid[0]?.length || 1;
  return (
    <div
      className={"dm-board" + (className ? " " + className : "")}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
        gap: `${cell * GAP_RATIO}px`,
      }}
    >
      {grid.flatMap((row, r) =>
        row.map((on, c) => (
          <span
            key={r + "-" + c}
            className={"dm-cell" + (on ? " on" : "") + (colon?.[r]?.[c] ? " clock-colon" : "")}
            style={{ borderRadius: cell * radius }}
          />
        ))
      )}
    </div>
  );
}

export default function DotMatrixBoard({ config, isEmbed }: { config: Config; isEmbed: boolean }) {
  const [state, setState] = useState(() => getDisplayState(config));
  const [cell, setCell] = useState(12);
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

  const grid = useMemo(() => buildMatrix(state.lines), [state.lines]);
  const colon = useMemo(
    () => (config.mode === "clock" ? colonMask(state.lines) : null),
    [state.lines, config.mode]
  );
  const capGrid = useMemo(
    () => (state.caption ? buildMatrix([state.caption.toUpperCase()], 0, 0) : null),
    [state.caption]
  );
  const rows = grid.length;
  const cols = grid[0]?.length || 1;

  // Size the panel to fill the stage.
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
        if (el.classList.contains("dm-main")) continue;
        availH -= el.getBoundingClientRect().height + gap;
      }
      const cw = availW / (cols + (cols - 1) * GAP_RATIO);
      const ch = availH / (rows + (rows - 1) * GAP_RATIO);
      setCell(Math.max(2, Math.min(cw, ch, MAX_CELL)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [rows, cols, state.caption, isEmbed]);

  // caption cells are a fraction of the main cell size
  const capCell = Math.max(2.5, cell * 0.16);
  const radius = matrixRadius(config.matrixShape);

  return (
    <div id="stage" ref={stageRef}>
      {!isEmbed && capGrid && (
        <div id="caption-top" className="caption-dm" aria-label={state.caption}>
          <MatrixGrid grid={capGrid} cell={capCell} radius={radius} />
        </div>
      )}
      <MatrixGrid grid={grid} cell={cell} radius={radius} className="dm-main" colon={colon} />
    </div>
  );
}
