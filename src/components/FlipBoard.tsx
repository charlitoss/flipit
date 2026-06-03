import { MutableRefObject, useEffect, useRef } from "react";
import { Board } from "../lib/flipEngine";
import { renderClock, renderCountdown, renderMessage } from "../lib/display";
import type { Config } from "../lib/config";

interface Props {
  config: Config;
  soundOn: boolean;
  boardRef: MutableRefObject<Board | null>;
  onCaption: (s: string) => void;
  onCountdownFinish: () => void;
}

export default function FlipBoard({ config, soundOn, boardRef, onCaption, onCountdownFinish }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the latest sound flag without re-running the loop effects.
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  // Create the engine once and keep it sized to the viewport.
  useEffect(() => {
    const board = new Board(rootRef.current!);
    boardRef.current = board;
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => board.fit(), 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      boardRef.current = null;
    };
  }, [boardRef]);

  // Switching modes forces a clean relayout (rebuild from blank).
  useEffect(() => {
    boardRef.current?.forceRelayout();
  }, [config.mode, boardRef]);

  // Clock loop.
  useEffect(() => {
    if (config.mode !== "clock") return;
    const board = boardRef.current;
    if (!board) return;
    const run = () => renderClock(board, config.clockFormat, config.clockSeconds, onCaption);
    board.forceRelayout(); // format/seconds changes rebuild for a clean swap
    run();
    const id = window.setInterval(run, 250);
    return () => window.clearInterval(id);
  }, [config.mode, config.clockFormat, config.clockSeconds, boardRef, onCaption]);

  // Countdown loop.
  useEffect(() => {
    if (config.mode !== "countdown") return;
    const board = boardRef.current;
    if (!board) return;
    const cd = { cdEnd: config.cdEnd, cdDuration: config.cdDuration, cdDone: config.cdDone };
    const run = () => renderCountdown(board, cd, onCaption, onCountdownFinish, soundRef.current);
    board.forceRelayout();
    run();
    const id = window.setInterval(run, 250);
    return () => window.clearInterval(id);
  }, [
    config.mode,
    config.cdEnd,
    config.cdDuration,
    config.cdDone,
    boardRef,
    onCaption,
    onCountdownFinish,
  ]);

  // Message: render on text change WITHOUT forcing relayout, so only the
  // letters that actually changed flip (entering the mode already relaid out).
  useEffect(() => {
    if (config.mode !== "message") return;
    const board = boardRef.current;
    if (!board) return;
    renderMessage(board, config.message, onCaption);
  }, [config.mode, config.message, boardRef, onCaption]);

  return (
    <div id="stage">
      <div className="board" ref={rootRef} />
    </div>
  );
}
