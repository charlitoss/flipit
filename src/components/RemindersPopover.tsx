import { useState } from "react";
import { notifyPermission, notifySupported, requestNotify } from "../lib/notify";

interface Props {
  on: boolean;
  every: number;
  label: string;
  window: boolean;
  from: string;
  to: string;
  onToggle: (on: boolean) => void;
  onEvery: (minutes: number) => void;
  onLabel: (label: string) => void;
  onWindow: (on: boolean) => void;
  onFrom: (hhmm: string) => void;
  onTo: (hhmm: string) => void;
}

const PRESETS = [30, 45, 60];

export default function RemindersPopover({
  on,
  every,
  label,
  window: win,
  from,
  to,
  onToggle,
  onEvery,
  onLabel,
  onWindow,
  onFrom,
  onTo,
}: Props) {
  const [perm, setPerm] = useState<NotificationPermission>(notifyPermission());

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

      <div className="rem-note">
        {!notifySupported() ? (
          <span>Notifications aren’t supported in this browser. Reminders still chime + show a banner.</span>
        ) : perm === "granted" ? (
          <span className="rem-ok">✓ Desktop notifications enabled</span>
        ) : perm === "denied" ? (
          <span>Notifications are blocked in your browser settings. Reminders still chime + show a banner.</span>
        ) : (
          <button
            className="btn-ghost compact"
            onClick={async () => setPerm(await requestNotify())}
          >
            Enable desktop notifications
          </button>
        )}
      </div>
    </div>
  );
}
