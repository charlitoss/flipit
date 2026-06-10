import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import FlipBoard from "./components/FlipBoard";
import LedBoard from "./components/LedBoard";
import PixelBoard from "./components/PixelBoard";
import CrtOverlay from "./components/CrtOverlay";
import DotMatrixBoard from "./components/DotMatrixBoard";
import Toolbar from "./components/Toolbar";
import ModeControls from "./components/ModeControls";
import AppearancePopover from "./components/AppearancePopover";
import ExportPopover from "./components/ExportPopover";
import RemindersPopover from "./components/RemindersPopover";
import Toast from "./components/Toast";
import { Board } from "./lib/flipEngine";
import { setFlipSound } from "./lib/flipEngine";
import { tick, chime, unlockAudio } from "./lib/sound";
import { showNotification } from "./lib/notify";
import { withinReminderWindow } from "./lib/reminders";
import {
  nativeFullscreenSupported,
  fullscreenElement,
  enterFullscreen,
  exitFullscreen,
} from "./lib/fullscreen";
import { applyPaletteVars, isLightPalette, PALETTES, PALETTE_KEYS } from "./lib/palettes";
import { applyFont } from "./lib/fonts";
import { applyLed, LED_BY_KEY, LED_COLORS } from "./lib/led";
import { applyPixel, pixelColorOn } from "./lib/pixel";
import { applyMatrix, matrixColorOn } from "./lib/dotmatrix";
import { buildExport, downloadImage } from "./lib/exportImage";
import {
  Config,
  Mode,
  getInitial,
  saveState,
  baseURL,
} from "./lib/config";

const { config: INITIAL, isEmbed: IS_EMBED, hadUrlCfg: HAD_URL_CFG } = getInitial();

type Pop = "none" | "palette" | "export" | "reminders";

export default function App() {
  const [config, setConfig] = useState<Config>(INITIAL);
  const [openPop, setOpenPop] = useState<Pop>("none");
  const [replayNonce, setReplayNonce] = useState(0);
  // Fullscreen: native where supported, else a CSS pseudo-fullscreen (iPhone).
  const [nativeFs, setNativeFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);

  const boardRef = useRef<Board | null>(null);
  const openPopRef = useRef<Pop>(openPop);
  openPopRef.current = openPop;

  const update = useCallback((patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
  }, []);

  // Latest config for interval callbacks (avoids stale closures / re-subscribing).
  const configRef = useRef(config);
  configRef.current = config;

  // ----- Alerts (reminders) -----
  // playAlert: sound + (optional) desktop notification, no on-screen banner.
  // Used to open the persistent break card.
  const playAlert = useCallback((title: string, body: string, soundFn: () => void) => {
    if (IS_EMBED) return;
    soundFn();
    if (configRef.current.reminderNotify) showNotification(title, body);
  }, []);

  // fireAlert: playAlert + a transient on-screen toast (auto-clears). Used for
  // the brief "break's over" confirmation.
  const [toast, setToast] = useState<{ id: number; title: string; body: string } | null>(null);
  const toastTimer = useRef<number>();
  const fireAlert = useCallback(
    (title: string, body: string, soundFn: () => void) => {
      if (IS_EMBED) return;
      playAlert(title, body, soundFn);
      setToast({ id: Date.now(), title, body });
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 6000);
    },
    [playAlert]
  );

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
    document.body.classList.toggle("matrix-mode", config.style === "matrix");
    // Background texture follows the pixel variant: dots for square/grid, lines for line.
    const isPixel = config.style === "pixel";
    document.body.classList.toggle("pv-dots", isPixel && config.pixelVariant !== "line");
    document.body.classList.toggle("pv-lines", isPixel && config.pixelVariant === "line");
    document.body.classList.toggle("crt-on", isPixel && config.crtIntensity > 0);
    // CRT effect strength as a 0–1 factor (0.5 = the baseline look) for the CSS.
    document.body.style.setProperty("--crt", String(config.crtIntensity / 100));
  }, [config.style, config.pixelVariant, config.crtIntensity]);

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

  useLayoutEffect(() => {
    applyMatrix(config.matrixColor);
  }, [config.matrixColor]);

  // UI accent follows the LED/pixel color in those styles, otherwise the palette accent.
  // (Runs after applyPaletteVars so it has the final say on --accent.)
  useLayoutEffect(() => {
    const accent =
      config.style === "led"
        ? (LED_BY_KEY[config.ledColor] || LED_COLORS[0]).on
        : config.style === "pixel"
          ? pixelColorOn(config.pixelColor)
          : config.style === "matrix"
            ? matrixColorOn(config.matrixColor)
            : (PALETTES[config.palette] || PALETTES.onyx).vars.accent;
    document.body.style.setProperty("--accent", accent);
  }, [config.style, config.ledColor, config.pixelColor, config.matrixColor, config.palette]);

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
    if (nativeFullscreenSupported()) {
      if (fullscreenElement()) exitFullscreen();
      else enterFullscreen();
    } else {
      // iPhone Safari has no element Fullscreen API — fall back to an
      // immersive CSS layer that fills the dynamic viewport.
      setPseudoFs((v) => !v);
    }
  }, []);

  // Keep the toolbar icon in sync with the real fullscreen state (incl. Esc /
  // the OS leaving fullscreen). webkit-prefixed event covers Safari.
  useEffect(() => {
    const sync = () => setNativeFs(!!fullscreenElement());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("pseudo-fs", pseudoFs);
  }, [pseudoFs]);

  const fsActive = nativeFs || pseudoFs;

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

  // ----- Break / stand-up reminders -----
  // When the interval elapses, open the persistent break prompt (rather than a
  // fleeting toast). The anchor is NOT reset here — the next interval begins
  // only once the break is skipped or finished (see the break actions below).
  useEffect(() => {
    if (IS_EMBED || !config.reminderOn) return;
    const everyMs = Math.max(1, config.reminderEvery) * 60_000;
    const id = window.setInterval(() => {
      const c = configRef.current;
      // Don't nag while a prompt is up or a break is in progress.
      if (c.breakPrompt || c.breakEnd !== null) return;
      const last = c.reminderLast || Date.now();
      if (Date.now() - last < everyMs) return;
      // Respect the active-hours window; just slide the anchor while off-hours.
      if (!withinReminderWindow(c)) {
        update({ reminderLast: Date.now() });
        return;
      }
      playAlert("Time for a break", c.reminderLabel || "Stand up and move", chime);
      update({ breakPrompt: true });
    }, 5000);
    return () => window.clearInterval(id);
  }, [config.reminderOn, config.reminderEvery, config.reminderLabel, config.reminderWindow, config.reminderFrom, config.reminderTo, playAlert, update]);

  // Auto-end an active break: when the break clock runs out, restart the
  // next-break interval from now and chime a short "back to it".
  useEffect(() => {
    if (IS_EMBED || config.breakEnd === null) return;
    const id = window.setInterval(() => {
      const c = configRef.current;
      if (c.breakEnd !== null && Date.now() >= c.breakEnd) {
        update({ breakEnd: null, reminderLast: Date.now() });
        if (openPopRef.current === "reminders") setOpenPop("none");
        fireAlert("Break’s over", "Nice — back to it.", chime);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [config.breakEnd, fireAlert, update]);

  // Break-card actions.
  const takeBreak = useCallback(() => {
    unlockAudio(); // user gesture — lets the end-of-break chime play later
    const len = Math.max(1, configRef.current.breakLength);
    update({ breakPrompt: false, breakEnd: Date.now() + len * 60_000 });
  }, [update]);
  const skipBreak = useCallback(() => {
    // Skipped: the next interval starts right now. Close the dropdown so we
    // don't snap from the prompt straight to the settings view.
    update({ breakPrompt: false, reminderLast: Date.now() });
    setOpenPop("none");
  }, [update]);
  const endBreak = useCallback(() => {
    // Ended early: count the next interval from now.
    update({ breakEnd: null, reminderLast: Date.now() });
    setOpenPop("none");
  }, [update]);

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
          {config.crtIntensity > 0 && <CrtOverlay />}
        </>
      ) : config.style === "matrix" ? (
        <DotMatrixBoard config={config} isEmbed={IS_EMBED} />
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
            config={config}
            mode={config.mode}
            sound={config.sound}
            reminderOn={config.reminderOn}
            onMode={onMode}
            onToggleSound={toggleSound}
            onToggleReminders={() => togglePop("reminders")}
            onToggleAppearance={() => togglePop("palette")}
            onFullscreen={fullscreen}
            fullscreenActive={fsActive}
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
              matrixColor={config.matrixColor}
              matrixShape={config.matrixShape}
              crtIntensity={config.crtIntensity}
              onSelectStyle={(style) => update({ style })}
              onSelectPalette={(palette) => update({ palette })}
              onSelectFont={(font) => update({ font })}
              onSelectLed={(ledColor) => update({ ledColor })}
              onSelectPixel={(pixelVariant) => update({ pixelVariant })}
              onSelectPixelColor={(pixelColor) => update({ pixelColor })}
              onSelectMatrixColor={(matrixColor) => update({ matrixColor })}
              onSelectMatrixShape={(matrixShape) => update({ matrixShape })}
              onCrtIntensity={(crtIntensity) => update({ crtIntensity })}
            />
          )}

          {openPop === "export" && exportData && (
            <ExportPopover
              link={exportData.link}
              embed={exportData.embed}
              onDownload={() => downloadImage(config, boardRef.current)}
            />
          )}

          {openPop === "reminders" && (
            <RemindersPopover
              on={config.reminderOn}
              every={config.reminderEvery}
              label={config.reminderLabel}
              window={config.reminderWindow}
              from={config.reminderFrom}
              to={config.reminderTo}
              notify={config.reminderNotify}
              breakLength={config.breakLength}
              breakPrompt={config.breakPrompt}
              breakEnd={config.breakEnd}
              onTake={takeBreak}
              onSkip={skipBreak}
              onEnd={endBreak}
              onToggle={(reminderOn) => {
                if (reminderOn) unlockAudio();
                update(
                  reminderOn
                    ? { reminderOn, reminderLast: Date.now() }
                    : { reminderOn, breakPrompt: false, breakEnd: null }
                );
              }}
              onEvery={(reminderEvery) => update({ reminderEvery })}
              onBreakLength={(breakLength) => update({ breakLength })}
              onLabel={(reminderLabel) => update({ reminderLabel })}
              onWindow={(reminderWindow) => update({ reminderWindow })}
              onFrom={(reminderFrom) => update({ reminderFrom })}
              onTo={(reminderTo) => update({ reminderTo })}
              onNotify={(reminderNotify) => update({ reminderNotify })}
            />
          )}

          {toast && <Toast title={toast.title} body={toast.body} />}
        </>
      )}
    </>
  );
}
