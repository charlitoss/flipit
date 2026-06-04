import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { Board } from "../lib/flipEngine";
import { renderClock, renderCountdown, renderMessage } from "../lib/display";
import type { Config } from "../lib/config";

interface Props {
  config: Config;
  soundOn: boolean;
  isEmbed: boolean;
  replayNonce: number;
  boardRef: MutableRefObject<Board | null>;
  onCountdownFinish: () => void;
  onReplayRequest: () => void;
}

export default function FlipBoard({
  config,
  soundOn,
  isEmbed,
  replayNonce,
  boardRef,
  onCountdownFinish,
  onReplayRequest,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Caption text: `above` renders over the board, `below` under it.
  const [cap, setCap] = useState({ above: "", below: "" });
  const setCaption = useCallback((above: string, below: string) => setCap({ above, below }), []);

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
    const run = () => renderClock(board, config.clockFormat, config.clockSeconds, setCaption);
    board.forceRelayout(); // format/seconds changes rebuild for a clean swap
    run();
    const id = window.setInterval(run, 250);
    return () => window.clearInterval(id);
  }, [config.mode, config.clockFormat, config.clockSeconds, boardRef, setCaption]);

  // Countdown loop.
  useEffect(() => {
    if (config.mode !== "countdown") return;
    const board = boardRef.current;
    if (!board) return;
    const cd = { cdEnd: config.cdEnd, cdDuration: config.cdDuration, cdDone: config.cdDone };
    const run = () => renderCountdown(board, cd, setCaption, onCountdownFinish, soundRef.current);
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
    setCaption,
    onCountdownFinish,
  ]);

  // Message: render on text change without forcing a relayout (so only the
  // changed letters flip). A replayNonce bump forces a full rebuild + flutter.
  const prevNonce = useRef(replayNonce);
  useEffect(() => {
    if (config.mode !== "message") return;
    const board = boardRef.current;
    if (!board) return;
    if (replayNonce !== prevNonce.current) {
      board.forceRelayout();
      prevNonce.current = replayNonce;
    }
    renderMessage(board, config.message, setCaption);
  }, [config.mode, config.message, replayNonce, boardRef, setCaption]);

  // Tapping the board replays the message animation.
  const onStageClick = () => {
    if (config.mode === "message") onReplayRequest();
  };

  return (
    <>
      <div
        id="stage"
        className={config.mode === "message" ? "tappable" : ""}
        onClick={onStageClick}
      >
        {!isEmbed && cap.above && <div id="caption-top">{cap.above}</div>}
        <div className="board" ref={rootRef} />
      </div>
      {!isEmbed && cap.below && <div id="caption">{cap.below}</div>}
    </>
  );
}
