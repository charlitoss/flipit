import { VALID, HALF_MS, randGlyph } from "./chars";

// A per-flip sound callback, wired up by the app (so the engine stays
// independent of the audio module).
let flipSound: (() => void) | null = null;
export function setFlipSound(fn: (() => void) | null): void {
  flipSound = fn;
}

export interface Cell {
  ch: string;
  sep: boolean;
}
export type Snapshot = Cell[][];

// ---------- A single split-flap unit ----------
class Unit {
  isSep: boolean;
  current = " ";
  next = " ";
  queue: string[] = [];
  flipping = false;
  el: HTMLDivElement;
  private topC: HTMLElement;
  private botC: HTMLElement;
  private fTop: HTMLElement;
  private fBot: HTMLElement;

  constructor(isSep = false) {
    this.isSep = isSep;
    const el = document.createElement("div");
    el.className = "unit" + (isSep ? " sep" : "");
    el.innerHTML = `
      <div class="card top"><div class="char"></div></div>
      <div class="card bottom"><div class="char"></div></div>
      <div class="card flap flap-top"><div class="char"></div></div>
      <div class="card flap flap-bottom"><div class="char"></div></div>`;
    this.el = el;
    this.topC = el.querySelector(".top .char")!;
    this.botC = el.querySelector(".bottom .char")!;
    this.fTop = el.querySelector(".flap-top .char")!;
    this.fBot = el.querySelector(".flap-bottom .char")!;
    el.querySelector(".flap-bottom")!.addEventListener("animationend", () => this.finish());
    this.setStatic(" ");
  }

  private setStatic(ch: string): void {
    this.topC.textContent = ch;
    this.botC.textContent = ch;
  }

  // steps = total flips to reach the target. 1 = a single clean flip
  // (clock/countdown). >1 = airport flutter through random characters.
  set(ch: string, steps = 1): void {
    ch = ch.toUpperCase();
    if (!VALID.has(ch)) ch = " ";
    if (this.isSep) {
      this.current = ch;
      this.setStatic(ch);
      return;
    }
    if (ch === this.current && !this.flipping && this.queue.length === 0) return;

    // Build the sequence of characters to flap through, ending on the target.
    const seq: string[] = [];
    let last = this.flipping ? this.next : this.current;
    for (let i = 0; i < steps - 1; i++) {
      const r = randGlyph(last);
      seq.push(r);
      last = r;
    }
    seq.push(ch);
    this.queue = seq;

    if (!this.flipping) this.advance();
  }

  private advance(): void {
    this.flip(this.queue.shift()!);
  }

  private flip(target: string): void {
    this.flipping = true;
    this.next = target;
    // top static reveals the NEW top as the flap folds away
    this.topC.textContent = target;
    // bottom static keeps showing OLD until the bottom flap lands
    this.botC.textContent = this.current;
    // flaps
    this.fTop.textContent = this.current;
    this.fBot.textContent = target;
    // restart animation
    this.el.classList.remove("flipping");
    void this.el.offsetWidth;
    this.el.classList.add("flipping");
    if (flipSound) flipSound();
  }

  private finish(): void {
    this.botC.textContent = this.next;
    this.current = this.next;
    this.el.classList.remove("flipping");
    this.flipping = false;
    if (this.queue.length) this.advance();
  }
}

// ---------- The board of units ----------
export class Board {
  private root: HTMLElement;
  private rows: Unit[][] = [];
  private layoutKey = "";
  private maxCols = 0;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  // Force the next setLayout() to rebuild even if dimensions are unchanged.
  forceRelayout(): void {
    this.layoutKey = "";
  }

  // lines: array of strings; sepCols: column indices that are separators (single row only)
  setLayout(lines: string[], sepCols: Set<number> | null = null): boolean {
    const key =
      lines.map((l) => l.length).join("x") + "|" + (sepCols ? [...sepCols].join(",") : "");
    if (key === this.layoutKey) return false;
    this.layoutKey = key;
    this.root.innerHTML = "";
    this.rows = [];
    this.maxCols = Math.max(1, ...lines.map((l) => l.length));
    lines.forEach((line) => {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      const units: Unit[] = [];
      for (let i = 0; i < line.length; i++) {
        const isSep = !!sepCols && lines.length === 1 && sepCols.has(i);
        const u = new Unit(isSep);
        units.push(u);
        rowEl.appendChild(u.el);
      }
      this.root.appendChild(rowEl);
      this.rows.push(units);
    });
    this.fit();
    return true;
  }

  // cascade=true → airport flutter: each cell flaps through random characters,
  // with later cells flapping longer so the board resolves in a wave.
  render(lines: string[], cascade = false): void {
    const total = this.rows.reduce((a, r) => a + r.length, 0);
    let idx = 0;
    lines.forEach((line, ri) => {
      const units = this.rows[ri];
      if (!units) return;
      for (let i = 0; i < units.length; i++) {
        let steps = 1;
        if (cascade) {
          const wave = total > 1 ? idx / (total - 1) : 0; // 0 → 1 across the board
          steps = 7 + Math.round(wave * 13) + Math.floor(Math.random() * 4); // ~7–24 flaps
        }
        units[i].set(line[i] || " ", steps);
        idx++;
      }
    });
  }

  fit(): void {
    const stage = this.root.parentElement;
    if (!stage) return;
    const cs = getComputedStyle(stage);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const availW = stage.clientWidth - padX;
    const availH = stage.clientHeight - padY;
    const cols = this.maxCols;
    const rows = this.rows.length || 1;
    // unit width 0.78em, gap 0.09em, unit height 1.12em, row gap 0.16em (em == font-size)
    const widthPerEm = cols * 0.78 + (cols - 1) * 0.09;
    const heightPerEm = rows * 1.12 + (rows - 1) * 0.16;
    let font = Math.min(availW / widthPerEm, availH / heightPerEm);
    font = Math.min(font, 220); // cap
    font = Math.max(font, 8);
    this.root.style.fontSize = font + "px";
    this.root.style.setProperty("--persp", font * 3 + "px");
    this.root
      .querySelectorAll<HTMLElement>(".unit")
      .forEach((u) => u.style.setProperty("--half", HALF_MS + "ms"));
  }

  // Settled state of every cell, for image export.
  snapshot(): Snapshot {
    return this.rows.map((r) => r.map((u) => ({ ch: u.current, sep: u.isSep })));
  }
}
