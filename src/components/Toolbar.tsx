import type { Config, Mode } from "../lib/config";
import {
  SoundOnIcon,
  SoundOffIcon,
  PaletteIcon,
  FullscreenIcon,
  ShareIcon,
  BellIcon,
  PauseIcon,
  PlayIcon,
} from "./Icons";
import BellCountdown from "./BellCountdown";

interface Props {
  config: Config;
  mode: Mode;
  sound: boolean;
  reminderOn: boolean;
  pillBeat: boolean;
  onMode: (m: Mode) => void;
  onToggleSound: () => void;
  onToggleReminders: () => void;
  onTogglePause: () => void;
  onToggleAppearance: () => void;
  onFullscreen: () => void;
  onToggleExport: () => void;
}

const MODES: { key: Mode; label: string }[] = [
  { key: "clock", label: "Clock" },
  { key: "countdown", label: "Countdown" },
  { key: "message", label: "Message" },
];

export default function Toolbar({
  config,
  mode,
  sound,
  reminderOn,
  pillBeat,
  onMode,
  onToggleSound,
  onToggleReminders,
  onTogglePause,
  onToggleAppearance,
  onFullscreen,
  onToggleExport,
}: Props) {
  // A quick pause control is only useful while the next-break countdown is
  // running (not during a pending prompt or an active break).
  const canPause = reminderOn && config.breakEnd === null && !config.breakPrompt;
  const pauseLabel = config.reminderPaused ? "Resume reminders" : "Pause reminders";
  return (
    <div id="topbar">
      <div className="seg" id="modes">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={mode === m.key ? "active" : ""}
            onClick={() => onMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="tools">
        <button
          className={"icon-btn" + (sound ? " on" : "")}
          title={sound ? "Sound on" : "Sound off"}
          onClick={onToggleSound}
        >
          {sound ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <div
          className={
            "icon-btn bell-btn" +
            (reminderOn ? " on bell-on" : "") +
            (config.breakPrompt ? " bell-alert" : "") +
            (pillBeat ? " bell-collapse" : "")
          }
          data-pop-trigger
        >
          <button
            type="button"
            className="bell-face"
            title="Break reminders"
            aria-label="Break reminders"
            onClick={onToggleReminders}
          >
            <BellIcon />
            <span className="bell-cd-wrap">
              <BellCountdown config={config} />
            </span>
          </button>
          {canPause && (
            <button
              type="button"
              className="bell-pause"
              title={pauseLabel}
              aria-label={pauseLabel}
              onClick={onTogglePause}
            >
              {config.reminderPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
        </div>
        <button
          className="icon-btn"
          title="Color &amp; font"
          data-pop-trigger
          onClick={onToggleAppearance}
        >
          <PaletteIcon />
        </button>
        <button className="icon-btn" title="Fullscreen" onClick={onFullscreen}>
          <FullscreenIcon />
        </button>
        <button className="icon-btn" title="Export & share" data-pop-trigger onClick={onToggleExport}>
          <ShareIcon />
        </button>
      </div>
    </div>
  );
}
