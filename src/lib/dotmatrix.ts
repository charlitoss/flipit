// 5x7 dot-matrix font. Each glyph is 7 rows of "0"/"1" (1 = lit). Widths vary
// (digits/letters are 5 wide; the colon is 1 wide; etc.). The board renders a
// continuous grid of square cells — lit cells bright, unlit cells dim — like a
// real dot-matrix LED panel.
export const DM_H = 7;

const G: Record<string, string[]> = {
  "0": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  ",": ["00", "00", "00", "00", "00", "01", "10"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
  "'": ["1", "1", "0", "0", "0", "0", "0"],
  "!": ["1", "1", "1", "1", "1", "0", "1"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
};

const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

function glyphRows(ch: string): string[] {
  return G[ch] || G[ch.toUpperCase()] || BLANK;
}

type Glyph = (ch: string) => string[];

// Same width as the real glyph but blank — keeps the mask aligned to the grid.
function colonGlyph(ch: string): string[] {
  const g = glyphRows(ch);
  return ch === ":" ? g : g.map((row) => "0".repeat(row.length));
}

// One text line -> 7 rows of booleans (glyphs joined with a 1-col gap). The
// glyph picker lets us build either the lit grid (glyphRows) or a mask of just
// the colon cells (colonGlyph) at identical dimensions.
function lineGrid(text: string, glyph: Glyph = glyphRows): boolean[][] {
  const chars = [...text];
  const rows: string[] = Array.from({ length: DM_H }, () => "");
  chars.forEach((ch, idx) => {
    const g = glyph(ch);
    const w = g[0].length;
    for (let r = 0; r < DM_H; r++) {
      rows[r] += g[r] || "0".repeat(w);
      if (idx < chars.length - 1) rows[r] += "0"; // inter-glyph gap
    }
  });
  return rows.map((r) => [...r].map((c) => c === "1"));
}

// ---------- Cell shape presets (corner radius as a fraction of the cell) ----------
export interface MatrixShape {
  key: string;
  name: string;
  radius: number; // 0 = square, 0.16 = rounded, 0.5 = circle
}

export const MATRIX_SHAPES: MatrixShape[] = [
  { key: "square", name: "Square", radius: 0 },
  { key: "rounded", name: "Rounded", radius: 0.16 },
  { key: "dots", name: "Dots", radius: 0.5 },
];

export const MATRIX_SHAPE_KEYS = MATRIX_SHAPES.map((s) => s.key);
const MATRIX_SHAPE_BY_KEY: Record<string, MatrixShape> = Object.fromEntries(
  MATRIX_SHAPES.map((s) => [s.key, s])
);

export function matrixRadius(key: string): number {
  return (MATRIX_SHAPE_BY_KEY[key] || MATRIX_SHAPES[0]).radius;
}

// ---------- Color presets (classic dot-matrix sign colors) ----------
export interface MatrixColor {
  key: string;
  name: string;
  on: string; // lit cell color
  rgb: string; // "r,g,b" for the dim (unlit) tint + glow
}

export const MATRIX_COLORS: MatrixColor[] = [
  { key: "white", name: "White", on: "#f4f4f4", rgb: "244,244,244" },
  { key: "amber", name: "Amber", on: "#ffae29", rgb: "255,174,41" },
  { key: "red", name: "Red", on: "#ff4646", rgb: "255,70,70" },
  { key: "green", name: "Green", on: "#38e06a", rgb: "56,224,106" },
  { key: "cyan", name: "Cyan", on: "#36e0ff", rgb: "54,224,255" },
  { key: "blue", name: "Blue", on: "#6c8cff", rgb: "108,140,255" },
];

export const MATRIX_COLOR_KEYS = MATRIX_COLORS.map((c) => c.key);
export const MATRIX_COLOR_BY_KEY: Record<string, MatrixColor> = Object.fromEntries(
  MATRIX_COLORS.map((c) => [c.key, c])
);

// Unlit-cell tint strength — kept fairly dim so lit cells read clearly.
const DM_OFF_ALPHA = 0.13;

export function matrixColorOn(key: string): string {
  return (MATRIX_COLOR_BY_KEY[key] || MATRIX_COLORS[0]).on;
}
export function matrixOffColor(key: string): string {
  return `rgba(${(MATRIX_COLOR_BY_KEY[key] || MATRIX_COLORS[0]).rgb},${DM_OFF_ALPHA})`;
}

export function applyMatrix(key: string): void {
  const c = MATRIX_COLOR_BY_KEY[key] || MATRIX_COLORS[0];
  const s = document.body.style;
  s.setProperty("--dm-on", c.on);
  s.setProperty("--dm-off", `rgba(${c.rgb},${DM_OFF_ALPHA})`);
  s.setProperty("--dm-glow", `rgba(${c.rgb},0.45)`);
}

// Build the full panel grid for one or more lines, with a 1-cell border of
// unlit cells around the content (and a blank row between stacked lines).
function assemble(lines: string[], padX: number, padY: number, glyph: Glyph): boolean[][] {
  const grids = (lines.length ? lines : [" "]).map((l) => lineGrid(l, glyph));
  const width = Math.max(1, ...grids.map((g) => g[0].length));
  const out: boolean[][] = [];
  const blank = () => new Array(width + padX * 2).fill(false);
  for (let i = 0; i < padY; i++) out.push(blank());
  grids.forEach((g, li) => {
    if (li > 0) out.push(blank()); // gap between lines
    for (const row of g) {
      out.push([
        ...new Array(padX).fill(false),
        ...row,
        ...new Array(width - row.length + padX).fill(false),
      ]);
    }
  });
  for (let i = 0; i < padY; i++) out.push(blank());
  return out;
}

export function buildMatrix(lines: string[], padX = 1, padY = 1): boolean[][] {
  return assemble(lines, padX, padY, glyphRows);
}

// A grid (same dimensions as buildMatrix) marking only the lit cells of ":"
// glyphs, so the clock colon can be blinked in sync with the seconds.
export function colonMask(lines: string[], padX = 1, padY = 1): boolean[][] {
  return assemble(lines, padX, padY, colonGlyph);
}
