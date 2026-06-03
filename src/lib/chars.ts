// Ordered "alphabet" available on every flap. Anything else renders as blank.
export const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:'!?-/&@#%+°";
export const VALID = new Set(CHARS.split(""));
export const HALF_MS = 70; // half-flip duration (one fold = 2x this)

// Characters shown during the airport-style "flutter" before a cell settles.
const FLAP_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function randGlyph(exclude?: string): string {
  let c: string;
  do {
    c = FLAP_POOL[Math.floor(Math.random() * FLAP_POOL.length)];
  } while (c === exclude);
  return c;
}

// Uppercase + keep only supported glyphs (preserve newlines for multi-line messages).
export function sanitize(str: string): string {
  return str
    .toUpperCase()
    .split("")
    .map((c) => (VALID.has(c) ? c : c === "\n" ? "\n" : " "))
    .join("");
}
