// Color presets for the LED (14-segment) display.
export interface LedColor {
  key: string;
  name: string;
  on: string; // lit segment color
  off: string; // dim "ghost" segment color
  glow: string; // bloom color
}

export const LED_COLORS: LedColor[] = [
  { key: "red", name: "Red", on: "#ff3a3a", off: "rgba(74,18,18,0.35)", glow: "rgba(255,80,80,0.5)" },
  { key: "amber", name: "Amber", on: "#ffae29", off: "rgba(74,48,8,0.35)", glow: "rgba(255,180,60,0.5)" },
  { key: "blue", name: "Blue", on: "#36b6ff", off: "rgba(12,46,68,0.35)", glow: "rgba(90,195,255,0.5)" },
  { key: "teal", name: "Teal", on: "#1fd6c8", off: "rgba(10,66,62,0.35)", glow: "rgba(60,220,205,0.5)" },
  { key: "white", name: "White", on: "#f4f4f4", off: "rgba(58,58,58,0.35)", glow: "rgba(245,245,245,0.45)" },
];

export const LED_KEYS = LED_COLORS.map((c) => c.key);
export const LED_BY_KEY: Record<string, LedColor> = Object.fromEntries(
  LED_COLORS.map((c) => [c.key, c])
);

export function applyLed(key: string): void {
  const c = LED_BY_KEY[key] || LED_COLORS[0];
  const s = document.body.style;
  s.setProperty("--led-on", c.on);
  s.setProperty("--led-off", c.off);
  s.setProperty("--led-glow", c.glow);
}
