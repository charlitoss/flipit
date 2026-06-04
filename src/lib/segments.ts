// 14-segment alphanumeric LED display geometry + character map.
//
// Segments (viewBox 0 0 64 100):
//   a  top            b  top-right     c  bottom-right   d  bottom
//   e  bottom-left    f  top-left      g1 mid-left       g2 mid-right
//   h  top-left diag  i  top-center    j  top-right diag
//   k  bot-left diag  l  bot-center    m  bot-right diag

type Pt = [number, number];

const SEG_ENDS: Record<string, [Pt, Pt]> = {
  a: [[12, 6], [52, 6]],
  b: [[58, 12], [58, 46]],
  c: [[58, 54], [58, 88]],
  d: [[12, 94], [52, 94]],
  e: [[6, 54], [6, 88]],
  f: [[6, 12], [6, 46]],
  g1: [[12, 50], [29, 50]],
  g2: [[35, 50], [52, 50]],
  h: [[12, 12], [28, 44]],
  i: [[32, 12], [32, 44]],
  j: [[52, 12], [36, 44]],
  k: [[12, 88], [28, 56]],
  l: [[32, 56], [32, 88]],
  m: [[52, 88], [36, 56]],
};

const THICK = 6;

// A pointed (hexagonal) segment between two points.
function hexPts([p1, p2]: [Pt, Pt], t = THICK): Pt[] {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const ht = t / 2;
  const a: Pt = [p1[0] + ux * ht, p1[1] + uy * ht];
  const b: Pt = [p2[0] - ux * ht, p2[1] - uy * ht];
  return [
    p1,
    [a[0] + px * ht, a[1] + py * ht],
    [b[0] + px * ht, b[1] + py * ht],
    p2,
    [b[0] - px * ht, b[1] - py * ht],
    [a[0] - px * ht, a[1] - py * ht],
  ];
}

export const SEG_KEYS = Object.keys(SEG_ENDS);
// `points` (SVG string) for the React char; `pts` (numbers) for the canvas export.
export const SEG_POLYS = SEG_KEYS.map((key) => {
  const pts = hexPts(SEG_ENDS[key]);
  return { key, pts, points: pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") };
});

// The char viewBox the geometry is defined in.
export const CHAR_VB = { w: 64, h: 100 };

// Lit segments per character (compact strings; g1/g2 are two chars).
const RAW: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg1g2",
  "3": "abcdg1g2",
  "4": "bcfg1g2",
  "5": "acdfg1g2",
  "6": "acdefg1g2",
  "7": "abc",
  "8": "abcdefg1g2",
  "9": "abcdfg1g2",
  A: "abcefg1g2",
  B: "abcdg2il",
  C: "adef",
  D: "abcdil",
  E: "adefg1g2",
  F: "aefg1g2",
  G: "acdefg2",
  H: "bcefg1g2",
  I: "adil",
  J: "bcde",
  K: "efg1jm",
  L: "def",
  M: "bcefhj",
  N: "bcefhm",
  O: "abcdef",
  P: "abefg1g2",
  Q: "abcdefm",
  R: "abefg1g2m",
  S: "acdfg1g2",
  T: "ail",
  U: "bcdef",
  V: "efjk",
  W: "bcefkm",
  X: "hjkm",
  Y: "hjl",
  Z: "adjk",
  "-": "g1g2",
  "+": "g1g2il",
  "/": "jk",
  "'": "i",
  "!": "bi",
  "?": "abg2jl",
  ".": "",
  ",": "k",
  "&": " adhg1jl".trim(),
  "@": "abcdefg1im",
  "#": "bcg1g2il",
  "%": "afjkcm",
  "°": "afib",
};

function parse(s: string): Set<string> {
  return new Set(s.match(/g1|g2|[abcdefhijklm]/g) || []);
}

export const CHAR_MAP: Record<string, Set<string>> = {};
for (const [ch, segs] of Object.entries(RAW)) CHAR_MAP[ch] = parse(segs);

const EMPTY = new Set<string>();
export function litSegments(ch: string): Set<string> {
  return CHAR_MAP[ch.toUpperCase()] || EMPTY;
}
