import { useEffect, useState } from "react";
import { notifyPermission, notifySupported, requestNotify } from "../lib/notify";
import { fmtMs } from "../lib/reminders";

interface Props {
  on: boolean;
  every: number;
  label: string;
  window: boolean;
  from: string;
  to: string;
  notify: boolean;
  breakLength: number;
  breakPrompt: boolean;
  breakEnd: number | null;
  onToggle: (on: boolean) => void;
  onEvery: (minutes: number) => void;
  onLabel: (label: string) => void;
  onWindow: (on: boolean) => void;
  onFrom: (hhmm: string) => void;
  onTo: (hhmm: string) => void;
  onNotify: (on: boolean) => void;
  onBreakLength: (minutes: number) => void;
  onTake: () => void;
  onSkip: () => void;
  onEnd: () => void;
}

const PRESETS = [30, 45, 60];
const BREAK_PRESETS = [5, 10, 15];

export default function RemindersPopover({
  on,
  every,
  label,
  window: win,
  from,
  to,
  notify,
  breakLength,
  breakPrompt,
  breakEnd,
  onToggle,
  onEvery,
  onLabel,
  onWindow,
  onFrom,
  onTo,
  onNotify,
  onBreakLength,
  onTake,
  onSkip,
  onEnd,
}: Props) {
  const [perm, setPerm] = useState<NotificationPermission>(notifyPermission());

  // Tick once a second while a break is running so the countdown stays live.
  const [, tick] = useState(0);
  useEffect(() => {
    if (breakEnd === null) return;
    const id = window.setInterval(() => tick((n) => n + 1), 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakEnd]);

  // ----- Active break: a focused panel that replaces the settings -----
  if (breakEnd !== null) {
    return (
      <div id="remindersPop" className="popover rem-break" role="status" aria-live="polite">
        <h3>On a break</h3>
        <div className="break-clock" aria-label="Break time remaining">
          {fmtMs(Math.max(0, breakEnd - Date.now()))}
        </div>
        <div className="break-sub">Your next break is paused until this finishes.</div>
        <button className="btn-ghost" onClick={onEnd}>
          End break
        </button>
      </div>
    );
  }

  // ----- Pending prompt: take a break or skip -----
  if (breakPrompt) {
    return (
      <div id="remindersPop" className="popover rem-break" role="alertdialog" aria-label="Time for a break">
        <h3>Time for a break</h3>
        <div className="break-title">{label || "Stand up and move"}</div>
        <div className="break-sub">
          Take {breakLength} min — or skip and I’ll remind you next interval.
        </div>
        <div className="break-actions">
          <button className="btn-primary compact" onClick={onTake}>
            Take a break
          </button>
          <button className="btn-ghost" onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ----- Idle: the settings -----
  return (
    <div id="remindersPop" className="popover">
      <h3>Break reminders</h3>

      <div className="toggle-row">
        <span>Remind me to move</span>
        <label className="switch">
          <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />
          <span className="track" />
        </label>
      </div>

      <div className="rem-field">
        <span className="ctl-label">Every</span>
        <div className="seg small">
          {PRESETS.map((m) => (
            <button key={m} className={every === m ? "active" : ""} onClick={() => onEvery(m)}>
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="rem-field">
        <span className="ctl-label">Break for</span>
        <div className="seg small">
          {BREAK_PRESETS.map((m) => (
            <button
              key={m}
              className={breakLength === m ? "active" : ""}
              onClick={() => onBreakLength(m)}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="rem-field">
        <span className="ctl-label">Label</span>
        <input
          className="rem-input"
          type="text"
          value={label}
          maxLength={40}
          placeholder="Stand up and move"
          onChange={(e) => onLabel(e.target.value)}
        />
      </div>

      <div className="toggle-row rem-sep">
        <span>Only during certain hours</span>
        <label className="switch">
          <input type="checkbox" checked={win} onChange={(e) => onWindow(e.target.checked)} />
          <span className="track" />
        </label>
      </div>

      {win && (
        <div className="rem-field rem-window">
          <span className="ctl-label">Between</span>
          <div className="rem-times">
            <input className="rem-input" type="time" value={from} onChange={(e) => onFrom(e.target.value)} />
            <span className="rem-dash">–</span>
            <input className="rem-input" type="time" value={to} onChange={(e) => onTo(e.target.value)} />
          </div>
        </div>
      )}

      {perm === "granted" ? (
        <div className="toggle-row rem-sep">
          <span>Desktop notifications</span>
          <label className="switch">
            <input type="checkbox" checked={notify} onChange={(e) => onNotify(e.target.checked)} />
            <span className="track" />
          </label>
        </div>
      ) : (
        <div className="rem-note">
          {!notifySupported() ? (
            <span>Notifications aren’t supported in this browser. Reminders still chime + show a banner.</span>
          ) : perm === "denied" ? (
            <span>Notifications are blocked in your browser settings. Reminders still chime + show a banner.</span>
          ) : (
            <button
              className="btn-ghost compact"
              onClick={async () => {
                const p = await requestNotify();
                setPerm(p);
                if (p === "granted") onNotify(true);
              }}
            >
              Enable desktop notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
