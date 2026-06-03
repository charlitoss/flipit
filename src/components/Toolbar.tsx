import type { Mode } from "../lib/config";
import { SoundIcon, PaletteIcon, FullscreenIcon, ShareIcon } from "./Icons";

interface Props {
  mode: Mode;
  sound: boolean;
  onMode: (m: Mode) => void;
  onToggleSound: () => void;
  onTogglePalette: () => void;
  onFullscreen: () => void;
  onToggleExport: () => void;
}

const MODES: { key: Mode; label: string }[] = [
  { key: "clock", label: "Clock" },
  { key: "countdown", label: "Countdown" },
  { key: "message", label: "Message" },
];

export default function Toolbar({
  mode,
  sound,
  onMode,
  onToggleSound,
  onTogglePalette,
  onFullscreen,
  onToggleExport,
}: Props) {
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
          title="Sound"
          onClick={onToggleSound}
        >
          <SoundIcon />
        </button>
        <button className="icon-btn" title="Color palette" data-pop-trigger onClick={onTogglePalette}>
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
