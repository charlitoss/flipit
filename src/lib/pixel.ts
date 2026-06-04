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
