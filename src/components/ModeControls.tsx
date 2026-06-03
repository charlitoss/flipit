import { useRef, useState } from "react";
import type { Config } from "../lib/config";

interface Props {
  config: Config;
  onClockFormat: (f: "12" | "24") => void;
  onClockSeconds: (v: boolean) => void;
  onStartCountdown: (patch: Partial<Config>) => void;
  onMessageChange: (text: string) => void;
  onMessageDisplay: (text: string) => void;
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

function CountdownControls({ config, onStartCountdown }: Props) {
  const dur = config.cdDuration;
  const [target, setTarget] = useState(config.cdTarget || "");
  const [h, setH] = useState(String(Math.floor(dur / 3600)));
  const [m, setM] = useState(String(Math.floor((dur % 3600) / 60)));
  const [s, setS] = useState(String(dur % 60));
  const [done, setDone] = useState(config.cdDone);

  const start = () => {
    const patch: Partial<Config> = { cdDone: done || "TIMES UP" };
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
      <div className="ctl-group">
        <span className="ctl-label">or</span>
        <input className="ctl-date" type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <div className="ctl-group">
        <span className="ctl-label">Label</span>
        <input className="ctl-text" type="text" maxLength={20} value={done} onChange={(e) => setDone(e.target.value)} />
      </div>
      <button className="btn-primary compact" onClick={start}>
        Start
      </button>
    </>
  );
}

function MessageControls({ config, onMessageChange, onMessageDisplay }: Props) {
  const [text, setText] = useState(config.message);
  const timer = useRef<number | undefined>(undefined);

  const onInput = (v: string) => {
    setText(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onMessageChange(v || " "), 400);
  };

  return (
    <>
      <textarea
        className="ctl-msg"
        maxLength={240}
        placeholder="Type a message…"
        value={text}
        onChange={(e) => onInput(e.target.value)}
      />
      <button className="btn-primary compact" onClick={() => onMessageDisplay(text || " ")}>
        Display
      </button>
    </>
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
