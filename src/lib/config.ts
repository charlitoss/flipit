import { PALETTES, PALETTE_KEYS } from "./palettes";
import { FONT_KEYS } from "./fonts";
import { LED_KEYS } from "./led";
import { PIXEL_KEYS, PIXEL_COLOR_KEYS } from "./pixel";
import { MATRIX_COLOR_KEYS, MATRIX_SHAPE_KEYS } from "./dotmatrix";

export type Mode = "clock" | "countdown" | "message";
export type DisplayStyle = "flip" | "led" | "pixel" | "matrix";
const STYLE_KEYS: DisplayStyle[] = ["flip", "led", "pixel", "matrix"];

export interface Config {
  mode: Mode;
  clockFormat: "24" | "12";
  clockSeconds: boolean;
  sound: boolean;
  palette: string;
  font: string;
  style: DisplayStyle;
  ledColor: string;
  pixelVariant: string;
  pixelColor: string;
  matrixColor: string;
  matrixShape: string;
  crtIntensity: number; // CRT effect strength 0–100 (50 = baseline) for the CRT style
  cdTarget: string | null; // datetime-local string, for the input
  cdDuration: number; // seconds, fallback when no active countdown
  cdEnd: number | null; // active end timestamp (ms)
  cdDone: string;
  message: string;
  // Break / stand-up reminders (global; localStorage-only, never in the share URL)
  reminderOn: boolean;
  reminderEvery: number; // minutes between nudges
  reminderLabel: string;
  reminderLast: number; // ms timestamp of the last nudge (anchor)
  reminderWindow: boolean; // restrict reminders to an active-hours window
  reminderFrom: string; // "HH:MM" window start
  reminderTo: string; // "HH:MM" window end
  reminderNotify: boolean; // app-level toggle for desktop notifications (when permission granted)
  breakLength: number; // minutes of break time once a break is taken
  breakPrompt: boolean; // a break prompt card is currently showing
  breakEnd: number | null; // ms timestamp the active break ends (null = not on a break)
}

export const DEFAULT_CONFIG: Config = {
  mode: "clock",
  clockFormat: "24",
  clockSeconds: true,
  sound: false,
  palette: "onyx",
  font: "default",
  style: "flip",
  ledColor: "red",
  pixelVariant: "square",
  pixelColor: "white",
  matrixColor: "white",
  matrixShape: "rounded",
  crtIntensity: 50,
  cdTarget: null,
  cdDuration: 600,
  cdEnd: null,
  cdDone: "TIMES UP",
  message: "HELLO WORLD",
  reminderOn: false,
  reminderEvery: 30,
  reminderLabel: "Stand up and move",
  reminderLast: 0,
  reminderWindow: false,
  reminderFrom: "09:00",
  reminderTo: "17:00",
  reminderNotify: true,
  breakLength: 5,
  breakPrompt: false,
  breakEnd: null,
};

const STORAGE_KEY = "flipit";

// ---------- base64url ----------
function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---------- Compact, positional URL config ----------
// [modeCode, paletteIndex, ...mode-specific fields] — keeps shareable URLs short.
const MODE_CODE: Record<Mode, string> = { clock: "c", countdown: "d", message: "m" };
const CODE_MODE: Record<string, Mode> = { c: "clock", d: "countdown", m: "message" };

export function encodeCfg(c: Config): string {
  const arr: (string | number)[] = [
    MODE_CODE[c.mode],
    Math.max(0, PALETTE_KEYS.indexOf(c.palette)),
    Math.max(0, FONT_KEYS.indexOf(c.font)),
    Math.max(0, STYLE_KEYS.indexOf(c.style)),
    Math.max(0, LED_KEYS.indexOf(c.ledColor)),
    Math.max(0, PIXEL_KEYS.indexOf(c.pixelVariant)),
    Math.max(0, Math.min(100, Math.round(c.crtIntensity))),
    Math.max(0, PIXEL_COLOR_KEYS.indexOf(c.pixelColor)),
    Math.max(0, MATRIX_COLOR_KEYS.indexOf(c.matrixColor)),
    Math.max(0, MATRIX_SHAPE_KEYS.indexOf(c.matrixShape)),
  ];
  if (c.mode === "clock") {
    arr.push(c.clockFormat === "12" ? 1 : 0, c.clockSeconds ? 1 : 0);
  } else if (c.mode === "countdown") {
    arr.push(c.cdEnd || 0, c.cdDuration || 0, c.cdDone || "");
  } else {
    arr.push(c.message || "");
  }
  return b64urlEncode(JSON.stringify(arr));
}

export function decodeCfg(s: string): Partial<Config> | null {
  try {
    const a = JSON.parse(b64urlDecode(s));
    if (!Array.isArray(a)) return null;
    const o: Partial<Config> = { mode: CODE_MODE[a[0]] || "clock" };
    if (PALETTE_KEYS[a[1]]) o.palette = PALETTE_KEYS[a[1]];
    if (FONT_KEYS[a[2]]) o.font = FONT_KEYS[a[2]];
    o.style = STYLE_KEYS[a[3]] || "flip";
    if (LED_KEYS[a[4]]) o.ledColor = LED_KEYS[a[4]];
    if (PIXEL_KEYS[a[5]]) o.pixelVariant = PIXEL_KEYS[a[5]];
    o.crtIntensity = typeof a[6] === "number" ? Math.max(0, Math.min(100, a[6])) : 50;
    if (PIXEL_COLOR_KEYS[a[7]]) o.pixelColor = PIXEL_COLOR_KEYS[a[7]];
    if (MATRIX_COLOR_KEYS[a[8]]) o.matrixColor = MATRIX_COLOR_KEYS[a[8]];
    if (MATRIX_SHAPE_KEYS[a[9]]) o.matrixShape = MATRIX_SHAPE_KEYS[a[9]];
    if (o.mode === "clock") {
      o.clockFormat = a[10] ? "12" : "24";
      o.clockSeconds = !!a[11];
    } else if (o.mode === "countdown") {
      o.cdEnd = a[10] || null;
      o.cdDuration = a[11] || 600;
      o.cdDone = a[12] || "TIMES UP";
    } else {
      o.message = a[10] || " ";
    }
    return o;
  } catch {
    return null;
  }
}

function parseHash(): Record<string, string> {
  const h = location.hash.replace(/^#/, "");
  const out: Record<string, string> = {};
  h.split("&").forEach((p) => {
    if (!p) return;
    const i = p.indexOf("=");
    out[i < 0 ? p : p.slice(0, i)] = i < 0 ? "" : p.slice(i + 1);
  });
  return out;
}

// ---------- Persistence ----------
function loadState(): Partial<Config> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveState(config: Config, isEmbed: boolean): void {
  if (isEmbed) return; // embeds are driven by the URL, never persist
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

// ---------- Startup ----------
export interface Initial {
  config: Config;
  isEmbed: boolean;
  hadUrlCfg: boolean;
}

export function getInitial(): Initial {
  const hash = parseHash();
  const isEmbed = hash.e === "1";
  const urlCfg = hash.s ? decodeCfg(hash.s) : null;
  const loaded = isEmbed ? {} : loadState();
  const config: Config = { ...DEFAULT_CONFIG, ...loaded, ...(urlCfg || {}) };
  // Migrate from the old two-theme setting, and guard against unknown palettes.
  const legacy = loaded as unknown as Record<string, unknown>;
  if (!PALETTES[config.palette]) {
    config.palette = legacy.theme === "light" ? "departures" : "onyx";
  }
  delete (config as unknown as Record<string, unknown>).theme;
  return { config, isEmbed, hadUrlCfg: !!urlCfg };
}

// ---------- Share URLs ----------
export function baseURL(): string {
  return location.origin + location.pathname;
}
export function shareURL(config: Config, extra = ""): string {
  return baseURL() + "#s=" + encodeCfg(config) + extra;
}
