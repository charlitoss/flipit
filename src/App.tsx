import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import FlipBoard from "./components/FlipBoard";
import LedBoard from "./components/LedBoard";
import PixelBoard from "./components/PixelBoard";
import CrtOverlay from "./components/CrtOverlay";
import Toolbar from "./components/Toolbar";
import ModeControls from "./components/ModeControls";
import AppearancePopover from "./components/AppearancePopover";
import ExportPopover from "./components/ExportPopover";
import { Board } from "./lib/flipEngine";
import { setFlipSound } from "./lib/flipEngine";
import { tick, unlockAudio } from "./lib/sound";
import { applyPaletteVars, isLightPalette, PALETTES, PALETTE_KEYS } from "./lib/palettes";
import { applyFont } from "./lib/fonts";
import { applyLed, LED_BY_KEY, LED_COLORS } from "./lib/led";
import { applyPixel, pixelColorOn } from "./lib/pixel";
import { buildExport, downloadImage } from "./lib/exportImage";
import {
  Config,
  Mode,
  getInitial,
  saveState,
  baseURL,
} from "./lib/config";

const { config: INITIAL, isEmbed: IS_EMBED, hadUrlCfg: HAD_URL_CFG } = getInitial();

type Pop = "none" | "palette" | "export";

export default function App() {
  const [config, setConfig] = useState<Config>(INITIAL);
  const [openPop, setOpenPop] = useState<Pop>("none");
  const [replayNonce, setReplayNonce] = useState(0);

  const boardRef = useRef<Board | null>(null);
  const openPopRef = useRef<Pop>(openPop);
  openPopRef.current = openPop;

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

  useLayoutEffect(() => {
    document.body.classList.toggle("led-mode", config.style === "led");
    document.body.classList.toggle("pixel-mode", config.style === "pixel");
    // Background texture follows the pixel variant: dots for square/grid, lines for line.
    const isPixel = config.style === "pixel";
    document.body.classList.toggle("pv-dots", isPixel && config.pixelVariant !== "line");
    document.body.classList.toggle("pv-lines", isPixel && config.pixelVariant === "line");
    document.body.classList.toggle("crt-on", isPixel && config.crt);
  }, [config.style, config.pixelVariant, config.crt]);

  // Light chrome only for light palettes in the flip style; LED/Pixel are dark.
  useLayoutEffect(() => {
    const light = config.style === "flip" && isLightPalette(config.palette);
    document.body.classList.toggle("light", light);
  }, [config.style, config.palette]);

  useLayoutEffect(() => {
    applyLed(config.ledColor);
  }, [config.ledColor]);

  useLayoutEffect(() => {
    applyPixel(config.pixelColor);
  }, [config.pixelColor]);

  // UI accent follows the LED/pixel color in those styles, otherwise the palette accent.
  // (Runs after applyPaletteVars so it has the final say on --accent.)
  useLayoutEffect(() => {
    const accent =
      config.style === "led"
        ? (LED_BY_KEY[config.ledColor] || LED_COLORS[0]).on
        : config.style === "pixel"
          ? pixelColorOn(config.pixelColor)
          : (PALETTES[config.palette] || PALETTES.onyx).vars.accent;
    document.body.style.setProperty("--accent", accent);
  }, [config.style, config.ledColor, config.pixelColor, config.palette]);

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

  // Bump a nonce to replay the airport flutter for the current message.
  const replayMessage = useCallback(() => setReplayNonce((n) => n + 1), []);

  // Start a countdown (also unlocks audio so the end alarm can play later).
  const startCountdown = useCallback(
    (patch: Partial<Config>) => {
      unlockAudio();
      setConfig((c) => ({ ...c, ...patch }));
    },
    []
  );

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

  const exportData = openPop === "export" ? buildExport(config) : null;

  return (
    <>
      <SpeedInsights />
      {config.style === "led" ? (
        <LedBoard config={config} isEmbed={IS_EMBED} />
      ) : config.style === "pixel" ? (
        <>
          <PixelBoard config={config} isEmbed={IS_EMBED} />
          {config.crt && <CrtOverlay />}
        </>
      ) : (
        <FlipBoard
          config={config}
          isEmbed={IS_EMBED}
          replayNonce={replayNonce}
          boardRef={boardRef}
          onReplayRequest={replayMessage}
        />
      )}

      {!IS_EMBED && (
        <>
          <header className="sr-only">
            <h1>Flipit — a split-flap (Solari) display for your browser</h1>
            <p>
              A free flip clock, countdown timer, and animated message board with retro and
              condensed fonts, color palettes, fullscreen, shareable links and an embeddable widget.
            </p>
          </header>

          <Toolbar
            mode={config.mode}
            sound={config.sound}
            onMode={onMode}
            onToggleSound={toggleSound}
            onToggleAppearance={() => togglePop("palette")}
            onFullscreen={fullscreen}
            onToggleExport={() => togglePop("export")}
          />

          <ModeControls
            config={config}
            onClockFormat={(clockFormat) => update({ clockFormat })}
            onClockSeconds={(clockSeconds) => update({ clockSeconds })}
            onStartCountdown={startCountdown}
            onMessageChange={(message) => update({ message })}
            onReplay={replayMessage}
          />

          {openPop === "palette" && (
            <AppearancePopover
              style={config.style}
              palette={config.palette}
              font={config.font}
              ledColor={config.ledColor}
              pixelVariant={config.pixelVariant}
              pixelColor={config.pixelColor}
              crt={config.crt}
              onSelectStyle={(style) => update({ style })}
              onSelectPalette={(palette) => update({ palette })}
              onSelectFont={(font) => update({ font })}
              onSelectLed={(ledColor) => update({ ledColor })}
              onSelectPixel={(pixelVariant) => update({ pixelVariant })}
              onSelectPixelColor={(pixelColor) => update({ pixelColor })}
              onToggleCrt={(crt) => update({ crt })}
            />
          )}

          {openPop === "export" && exportData && (
            <ExportPopover
              link={exportData.link}
              embed={exportData.embed}
              onDownload={() => downloadImage(config, boardRef.current)}
            />
          )}
        </>
      )}
    </>
  );
}
