// Geist Pixel (Vercel) display variants. The pixel look lives in the font
// itself; each variant is a separate font file (loaded in index.css).
export interface PixelVariant {
  key: string;
  name: string;
  family: string;
}

export const PIXEL_VARIANTS: PixelVariant[] = [
  { key: "square", name: "Square", family: "Geist Pixel Square" },
  { key: "grid", name: "Grid", family: "Geist Pixel Grid" },
  { key: "line", name: "Line", family: "Geist Pixel Line" },
];

export const PIXEL_KEYS = PIXEL_VARIANTS.map((v) => v.key);
export const PIXEL_BY_KEY: Record<string, PixelVariant> = Object.fromEntries(
  PIXEL_VARIANTS.map((v) => [v.key, v])
);

export function pixelFamily(key: string): string {
  return (PIXEL_BY_KEY[key] || PIXEL_VARIANTS[0]).family;
}

// 16-bit-flavored color presets for the pixel display.
export interface PixelColor {
  key: string;
  name: string;
  on: string; // lit pixel color
  rgb: string; // "r,g,b" for building dim/backdrop tints
}

export const PIXEL_COLORS: PixelColor[] = [
  { key: "white", name: "White", on: "#f4f5f7", rgb: "244,245,247" },
  { key: "green", name: "Green", on: "#3df06a", rgb: "61,240,106" },
  { key: "amber", name: "Amber", on: "#ffb22e", rgb: "255,178,46" },
  { key: "cyan", name: "Cyan", on: "#36e0ff", rgb: "54,224,255" },
  { key: "magenta", name: "Magenta", on: "#ff5ed6", rgb: "255,94,214" },
  { key: "blue", name: "Blue", on: "#6c7bff", rgb: "108,123,255" },
];

export const PIXEL_COLOR_KEYS = PIXEL_COLORS.map((c) => c.key);
export const PIXEL_COLOR_BY_KEY: Record<string, PixelColor> = Object.fromEntries(
  PIXEL_COLORS.map((c) => [c.key, c])
);

export function pixelColorOn(key: string): string {
  return (PIXEL_COLOR_BY_KEY[key] || PIXEL_COLORS[0]).on;
}

// SVG tile of one dim square pixel, used as the backdrop grid (tinted to the color).
function pixelTileURL(fill: string): string {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='5' height='5'>" +
    "<rect x='0.75' y='0.75' width='3.5' height='3.5' fill='" +
    fill +
    "'/></svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function applyPixel(key: string): void {
  const c = PIXEL_COLOR_BY_KEY[key] || PIXEL_COLORS[0];
  const dim = `rgba(${c.rgb},0.1)`;
  const s = document.body.style;
  s.setProperty("--pixel-on", c.on);
  s.setProperty("--pixel-dim", dim);
  s.setProperty("--px-tile", pixelTileURL(dim));
}
