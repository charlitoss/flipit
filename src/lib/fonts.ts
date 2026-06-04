export interface FontDef {
  key: string;
  name: string;
  category: string;
  family: string; // primary family name (for document.fonts.load); "" = system
  stack: string; // full CSS font-family value
  weight: number;
  scale: number; // glyph size multiplier to optically balance each face
}

// The board glyphs are mostly uppercase letters, digits and ":" — these faces
// all render those well. `scale` keeps each face filling the cell nicely.
export const FONTS: FontDef[] = [
  { key: "default", name: "Helvetica Neue", category: "Clean", family: "", stack: '"Helvetica Neue", Arial, sans-serif', weight: 700, scale: 1 },
  { key: "space", name: "Space Grotesk", category: "Clean", family: "Space Grotesk", stack: '"Space Grotesk", sans-serif', weight: 700, scale: 1 },

  { key: "oswald", name: "Oswald", category: "Condensed", family: "Oswald", stack: '"Oswald", sans-serif', weight: 600, scale: 1.04 },
  { key: "archivo", name: "Archivo Narrow", category: "Condensed", family: "Archivo Narrow", stack: '"Archivo Narrow", sans-serif', weight: 700, scale: 1.04 },

  { key: "orbitron", name: "Orbitron", category: "Retro / Modern", family: "Orbitron", stack: '"Orbitron", sans-serif', weight: 700, scale: 0.84 },
  { key: "bungee", name: "Bungee", category: "Retro / Modern", family: "Bungee", stack: '"Bungee", sans-serif', weight: 400, scale: 0.74 },
];

export const FONT_KEYS = FONTS.map((f) => f.key);
export const FONT_BY_KEY: Record<string, FontDef> = Object.fromEntries(FONTS.map((f) => [f.key, f]));

// Ordered list of categories, preserving FONTS order.
export const FONT_CATEGORIES = FONTS.reduce<string[]>((cats, f) => {
  if (!cats.includes(f.category)) cats.push(f.category);
  return cats;
}, []);

export function applyFont(key: string): void {
  const f = FONT_BY_KEY[key] || FONTS[0];
  const s = document.body.style;
  s.setProperty("--board-font", f.stack);
  s.setProperty("--board-weight", String(f.weight));
  s.setProperty("--glyph-scale", String(f.scale));
}
