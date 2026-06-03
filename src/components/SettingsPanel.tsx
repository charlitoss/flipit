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

function ClockSettings({ config, onClockFormat, onClockSeconds }: Props) {
  return (
    <div>
      <h3>Clock</h3>
      <div className="field">
        <label>Format</label>
        <div className="seg small">
          <button
            className={config.clockFormat === "24" ? "active" : ""}
            onClick={() => onClockFormat("24")}
          >
            24-hour
          </button>
          <button
            className={config.clockFormat === "12" ? "active" : ""}
            onClick={() => onClockFormat("12")}
          >
            12-hour
          </button>
        </div>
      </div>
      <div className="field">
        <div className="toggle-row">
          <span>Show seconds</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={config.clockSeconds}
              onChange={(e) => onClockSeconds(e.target.checked)}
            />
            <span className="track" />
          </label>
        </div>
      </div>
    </div>
  );
}

function CountdownSettings({ config, onStartCountdown }: Props) {
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
    <div>
      <h3>Countdown</h3>
      <div className="field">
        <label>Target date &amp; time</label>
        <input type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} />
        <div className="hint">Or set a quick duration below.</div>
      </div>
      <div className="row-2">
        <div className="field">
          <label>Hours</label>
          <input type="number" min={0} value={h} onChange={(e) => setH(e.target.value)} />
        </div>
        <div className="field">
          <label>Min</label>
          <input type="number" min={0} value={m} onChange={(e) => setM(e.target.value)} />
        </div>
        <div className="field">
          <label>Sec</label>
          <input type="number" min={0} value={s} onChange={(e) => setS(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Label when finished</label>
        <input
          type="text"
          maxLength={20}
          value={done}
          onChange={(e) => setDone(e.target.value)}
        />
      </div>
      <button className="btn-primary" onClick={start}>
        Start countdown
      </button>
    </div>
  );
}

function MessageSettings({ config, onMessageChange, onMessageDisplay }: Props) {
  const [text, setText] = useState(config.message);
  const timer = useRef<number | undefined>(undefined);

  const onInput = (v: string) => {
    setText(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onMessageChange(v || " "), 400);
  };

  return (
    <div>
      <h3>Message</h3>
      <div className="field">
        <label>Text</label>
        <textarea
          maxLength={240}
          placeholder="Type a message…"
          value={text}
          onChange={(e) => onInput(e.target.value)}
        />
        <div className="hint">
          Letters, numbers &amp; . , : ' ! ? - / are supported. Use Enter for new lines.
        </div>
      </div>
      <button className="btn-primary" onClick={() => onMessageDisplay(text || " ")}>
        Display
      </button>
    </div>
  );
}

export default function SettingsPanel(props: Props) {
  return (
    <div id="panel" className="popover">
      {props.config.mode === "clock" && <ClockSettings {...props} />}
      {props.config.mode === "countdown" && <CountdownSettings {...props} />}
      {props.config.mode === "message" && <MessageSettings {...props} />}
    </div>
  );
}
