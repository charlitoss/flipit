import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { Board } from "../lib/flipEngine";
import { renderClock, renderCountdown, renderMessage } from "../lib/display";
import { alarm } from "../lib/sound";
import type { Config } from "../lib/config";

interface Props {
  config: Config;
  isEmbed: boolean;
  replayNonce: number;
  boardRef: MutableRefObject<Board | null>;
  onReplayRequest: () => void;
}

export default function FlipBoard({
  config,
  isEmbed,
  replayNonce,
  boardRef,
  onReplayRequest,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Caption shown above the board (clock date, countdown status). The second
  // arg is kept for API symmetry but is currently unused.
  const [capAbove, setCapAbove] = useState("");
  const setCaption = useCallback((above: string, _below: string) => setCapAbove(above), []);

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

  // Countdown loop. The board holds at 00:00:00 once finished; the alarm fires
  // once, on the transition to zero (not if it loads already expired).
  useEffect(() => {
    if (config.mode !== "countdown") return;
    const board = boardRef.current;
    if (!board) return;
    const cd = { cdEnd: config.cdEnd, cdDuration: config.cdDuration };
    let sawRunning = false;
    let firedAlarm = false;
    const run = () => {
      const atZero = renderCountdown(board, cd, setCaption);
      if (!atZero) {
        sawRunning = true;
      } else if (sawRunning && !firedAlarm) {
        firedAlarm = true;
        alarm();
      }
    };
    board.forceRelayout();
    run();
    const id = window.setInterval(run, 250);
    return () => window.clearInterval(id);
  }, [config.mode, config.cdEnd, config.cdDuration, boardRef, setCaption]);

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
        {!isEmbed && capAbove && <div id="caption-top">{capAbove}</div>}
        <div className="board" ref={rootRef} />
      </div>
    </>
  );
}
