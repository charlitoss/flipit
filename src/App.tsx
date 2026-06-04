import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import FlipBoard from "./components/FlipBoard";
import Toolbar from "./components/Toolbar";
import ModeControls from "./components/ModeControls";
import PalettePopover from "./components/PalettePopover";
import FontPopover from "./components/FontPopover";
import ExportPopover from "./components/ExportPopover";
import { Board } from "./lib/flipEngine";
import { setFlipSound } from "./lib/flipEngine";
import { renderMessage } from "./lib/display";
import { tick } from "./lib/sound";
import { applyPaletteVars, PALETTE_KEYS } from "./lib/palettes";
import { applyFont } from "./lib/fonts";
import { buildExport, downloadImage } from "./lib/exportImage";
import {
  Config,
  Mode,
  getInitial,
  saveState,
  baseURL,
} from "./lib/config";

const { config: INITIAL, isEmbed: IS_EMBED, hadUrlCfg: HAD_URL_CFG } = getInitial();
const noop = () => {};

type Pop = "none" | "palette" | "font" | "export";

export default function App() {
  const [config, setConfig] = useState<Config>(INITIAL);
  const [openPop, setOpenPop] = useState<Pop>("none");
  const [caption, setCaption] = useState("");

  const boardRef = useRef<Board | null>(null);
  const openPopRef = useRef<Pop>(openPop);
  openPopRef.current = openPop;
  const configRef = useRef(config);
  configRef.current = config;

  const update = useCallback((patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
  }, []);

  // ----- Persist + apply palette/sound/embed -----
  useEffect(() => {
    saveState(config, IS_EMBED);
  }, [config]);

  useLayoutEffect(() => {
    applyPaletteVars(config.palette);
  }, [config.palette]);

  useLayoutEffect(() => {
    applyFont(config.font);
  }, [config.font]);

  useEffect(() => {
    setFlipSound(config.sound ? tick : null);
  }, [config.sound]);

  useLayoutEffect(() => {
    document.body.classList.toggle("embed", IS_EMBED);
    // Shared (non-embed) link: apply once, then clean the URL so the visitor's
    // own later tweaks (saved locally) win on refresh.
    if (!IS_EMBED && HAD_URL_CFG) {
      try {
        history.replaceState(null, "", baseURL());
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ----- Toolbar actions -----
  const toggleSound = useCallback(() => {
    setConfig((c) => {
      if (!c.sound) tick(); // unlock audio + sample
      return { ...c, sound: !c.sound };
    });
  }, []);

  const fullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const onCountdownFinish = useCallback(() => {
    setConfig((c) => ({ ...c, cdEnd: null }));
  }, []);

  // Replay the airport flutter for the message currently on the board.
  const replayMessage = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    b.forceRelayout();
    renderMessage(b, configRef.current.message, setCaption);
  }, []);

  // ----- Keyboard shortcuts (skip in embed) -----
  useEffect(() => {
    if (IS_EMBED) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches?.("input, textarea")) return;
      if (e.key === "f") fullscreen();
      else if (e.key === "1") update({ mode: "clock" });
      else if (e.key === "2") update({ mode: "countdown" });
      else if (e.key === "3") update({ mode: "message" });
      else if (e.key === "s") toggleSound();
      else if (e.key === "t") {
        setConfig((c) => {
          const i = PALETTE_KEYS.indexOf(c.palette);
          return { ...c, palette: PALETTE_KEYS[(i + 1) % PALETTE_KEYS.length] };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, toggleSound, update]);

  // ----- Controls are hidden by default and reveal on activity (toggle the
  // body class directly to avoid re-renders). They stay visible while a popover
  // is open or while interacting with the on-screen controls. -----
  useEffect(() => {
    if (IS_EMBED) return;
    document.body.classList.add("idle"); // hidden until the first movement
    let t: number | undefined;
    const interacting = () => {
      if (openPopRef.current !== "none") return true;
      const ae = document.activeElement as HTMLElement | null;
      return !!ae?.closest?.("#topbar, #modeControls, .popover");
    };
    const schedule = () => {
      window.clearTimeout(t);
      const check = () => {
        if (interacting()) {
          t = window.setTimeout(check, 1500);
          return;
        }
        document.body.classList.add("idle");
      };
      t = window.setTimeout(check, 3000);
    };
    const wake = () => {
      document.body.classList.remove("idle");
      schedule();
    };
    const events = ["mousemove", "touchstart", "keydown", "click", "focusin"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      window.clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, []);

  // ----- Close popovers when clicking outside them -----
  useEffect(() => {
    if (IS_EMBED) return;
    const onDown = (e: PointerEvent) => {
      if (openPopRef.current === "none") return;
      const t = e.target as HTMLElement;
      if (t.closest(".popover") || t.closest("[data-pop-trigger]")) return;
      setOpenPop("none");
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const togglePop = (p: Pop) => setOpenPop((cur) => (cur === p ? "none" : p));

  const onMode = (m: Mode) => update({ mode: m });

  const exportData = openPop === "export" ? buildExport(config, boardRef.current) : null;

  return (
    <>
      <SpeedInsights />
      <FlipBoard
        config={config}
        soundOn={config.sound}
        boardRef={boardRef}
        onCaption={IS_EMBED ? noop : setCaption}
        onCountdownFinish={onCountdownFinish}
      />

      {!IS_EMBED && (
        <>
          <header className="sr-only">
            <h1>Flipit — a split-flap (Solari) display for your browser</h1>
            <p>
              A free flip clock, countdown timer, and animated message board with retro and
              condensed fonts, color palettes, fullscreen, shareable links and an embeddable widget.
            </p>
          </header>

          <div id="caption">{caption}</div>

          <Toolbar
            mode={config.mode}
            sound={config.sound}
            onMode={onMode}
            onToggleSound={toggleSound}
            onTogglePalette={() => togglePop("palette")}
            onToggleFont={() => togglePop("font")}
            onFullscreen={fullscreen}
            onToggleExport={() => togglePop("export")}
          />

          <ModeControls
            config={config}
            onClockFormat={(clockFormat) => update({ clockFormat })}
            onClockSeconds={(clockSeconds) => update({ clockSeconds })}
            onStartCountdown={(patch) => update(patch)}
            onMessageChange={(message) => update({ message })}
            onMessageDisplay={(message) => update({ message })}
            onReplay={replayMessage}
          />

          {openPop === "palette" && (
            <PalettePopover
              palette={config.palette}
              onSelect={(palette) => update({ palette })}
            />
          )}

          {openPop === "font" && (
            <FontPopover font={config.font} onSelect={(font) => update({ font })} />
          )}

          {openPop === "export" && exportData && (
            <ExportPopover
              link={exportData.link}
              embed={exportData.embed}
              onDownload={() => boardRef.current && downloadImage(boardRef.current, config)}
            />
          )}
        </>
      )}
    </>
  );
}
