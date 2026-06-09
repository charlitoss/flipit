import { useLayoutEffect, useRef, useState } from "react";
import type { Config } from "../lib/config";
import { ReplayIcon } from "./Icons";

interface Props {
  config: Config;
  onClockFormat: (f: "12" | "24") => void;
  onClockSeconds: (v: boolean) => void;
  onStartCountdown: (patch: Partial<Config>) => void;
  onClearCountdown: () => void;
  onCdDone: (text: string) => void;
  onMessageChange: (text: string) => void;
  onReplay: () => void;
}

function ClockControls({ config, onClockFormat, onClockSeconds }: Props) {
  return (
    <>
      <div className="ctl-group">
        <span className="ctl-label">Format</span>
        <div className="seg inline-seg">
          <button
            className={config.clockFormat === "24" ? "active" : ""}
            onClick={() => onClockFormat("24")}
          >
            24h
          </button>
          <button
            className={config.clockFormat === "12" ? "active" : ""}
            onClick={() => onClockFormat("12")}
          >
            12h
          </button>
        </div>
      </div>
      <div className="ctl-group">
        <span className="ctl-label">Seconds</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={config.clockSeconds}
            onChange={(e) => onClockSeconds(e.target.checked)}
          />
          <span className="track" />
        </label>
      </div>
    </>
  );
}

function CountdownControls({ config, onStartCountdown, onClearCountdown, onCdDone }: Props) {
  const dur = config.cdDuration;
  const active = config.cdEnd !== null;
  const [target, setTarget] = useState(config.cdTarget || "");
  const [h, setH] = useState(String(Math.floor(dur / 3600)));
  const [m, setM] = useState(String(Math.floor((dur % 3600) / 60)));
  const [s, setS] = useState(String(dur % 60));

  const start = () => {
    const patch: Partial<Config> = {};
    if (target) {
      const t = new Date(target).getTime();
      if (!isNaN(t)) {
        patch.cdEnd = t;
        patch.cdTarget = target;
      }
    } else {
      const secs = (+h || 0) * 3600 + (+m || 0) * 60 + (+s || 0);
      patch.cdDuration = secs;
      patch.cdEnd = Date.now() + secs * 1000;
    }
    onStartCountdown(patch);
  };

  return (
    <>
      <div className="ctl-group">
        <span className="ctl-label">In</span>
        <input className="ctl-num" type="number" min={0} value={h} onChange={(e) => setH(e.target.value)} />
        <span className="ctl-unit">h</span>
        <input className="ctl-num" type="number" min={0} value={m} onChange={(e) => setM(e.target.value)} />
        <span className="ctl-unit">m</span>
        <input className="ctl-num" type="number" min={0} value={s} onChange={(e) => setS(e.target.value)} />
        <span className="ctl-unit">s</span>
      </div>
      <span className="ctl-label ctl-or">or</span>
      <input className="ctl-date" type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} />
      <div className="ctl-group">
        <span className="ctl-label">Ends</span>
        <input
          className="ctl-text"
          type="text"
          maxLength={40}
          placeholder="TIMES UP"
          value={config.cdDone}
          onChange={(e) => onCdDone(e.target.value)}
        />
      </div>
      <button className="btn-primary compact" onClick={start}>
        {active ? "Restart" : "Start"}
      </button>
      {active && (
        <button className="btn-ghost compact" onClick={onClearCountdown}>
          Clear
        </button>
      )}
    </>
  );
}

function MessageControls({ config, onMessageChange, onReplay }: Props) {
  const [text, setText] = useState(config.message);
  const timer = useRef<number | undefined>(undefined);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea to fit its content instead of scrolling.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    // scrollHeight excludes the border, but border-box height includes it.
    const border = ta.offsetHeight - ta.clientHeight;
    ta.style.height = ta.scrollHeight + border + "px";
  }, [text]);

  // Live update as you type — no Display button needed.
  const onInput = (v: string) => {
    setText(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onMessageChange(v || " "), 400);
  };

  return (
    <div className="msg-controls">
      <span className="ctl-label">Message</span>
      <div className="msg-row">
        <textarea
          ref={taRef}
          className="ctl-msg"
          rows={1}
          maxLength={240}
          placeholder="Type a message…"
          value={text}
          onChange={(e) => onInput(e.target.value)}
        />
        <button
          className="btn-ghost compact replay-btn"
          title="Run the animation again"
          aria-label="Replay animation"
          onClick={onReplay}
        >
          <ReplayIcon />
        </button>
      </div>
      <div className="ctl-hint">Press Enter for multiple lines. Tap the board to replay.</div>
    </div>
  );
}

export default function ModeControls(props: Props) {
  return (
    <div id="modeControls">
      <div className="controls-card">
        {props.config.mode === "clock" && <ClockControls {...props} />}
        {props.config.mode === "countdown" && <CountdownControls {...props} />}
        {props.config.mode === "message" && <MessageControls {...props} />}
      </div>
    </div>
  );
}
