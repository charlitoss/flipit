import type { Config, Mode } from "../lib/config";
import {
  SoundOnIcon,
  SoundOffIcon,
  PaletteIcon,
  FullscreenIcon,
  ShareIcon,
  BellIcon,
  CalendarIcon,
} from "./Icons";
import BellCountdown from "./BellCountdown";
import CalendarPill from "./CalendarPill";
import type { CalendarApi } from "../hooks/useCalendar";

interface Props {
  config: Config;
  mode: Mode;
  sound: boolean;
  reminderOn: boolean;
  cal: CalendarApi;
  onMode: (m: Mode) => void;
  onToggleSound: () => void;
  onToggleReminders: () => void;
  onToggleAgenda: () => void;
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
  cal,
  onMode,
  onToggleSound,
  onToggleReminders,
  onToggleAgenda,
  onToggleAppearance,
  onFullscreen,
  onToggleExport,
}: Props) {
  const calOn = cal.settings.on && !!cal.settings.url;
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
        <button
          className={
            "icon-btn bell-btn" +
            (reminderOn ? " on bell-on" : "") +
            (config.breakPrompt ? " bell-alert" : "")
          }
          title="Break reminders"
          aria-label="Break reminders"
          data-pop-trigger
          onClick={onToggleReminders}
        >
          <BellIcon />
          <span className="bell-cd-wrap">
            <BellCountdown config={config} events={cal.events} />
          </span>
        </button>
        <button
          className={"icon-btn cal-btn" + (calOn ? " on cal-on" : "")}
          title="Today’s calendar"
          aria-label="Today’s calendar"
          data-pop-trigger
          onClick={onToggleAgenda}
        >
          <CalendarIcon />
          <span className="cal-cd-wrap">
            <CalendarPill cal={cal} />
          </span>
        </button>
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
