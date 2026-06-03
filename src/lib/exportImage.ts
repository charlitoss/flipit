import { Board, Snapshot } from "./flipEngine";
import { PALETTES } from "./palettes";
import { Config, shareURL } from "./config";

interface Metrics {
  F: number;
  uW: number;
  uH: number;
  gap: number;
  rowGap: number;
  rad: number;
  glyph: number;
  sepW: number;
  margin: number;
  boardW: number;
  boardH: number;
  W: number;
  H: number;
  rowW: (cells: Snapshot[number]) => number;
}

// Board proportions in a fixed font-size space, used by both image + embed sizing.
function boardMetrics(snap: Snapshot): Metrics {
  const F = 150;
  const base = {
    F,
    uW: 0.78 * F,
    uH: 1.12 * F,
    gap: 0.09 * F,
    rowGap: 0.16 * F,
    rad: 0.08 * F,
    glyph: 0.82 * F,
    sepW: 0.4 * F,
    margin: 0.6 * F,
  };
  const rowW = (cells: Snapshot[number]) =>
    cells.reduce((w, c, i) => w + (c.sep ? base.sepW : base.uW) + (i ? base.gap : 0), 0);
  const boardW = Math.max(1, ...snap.map(rowW));
  const boardH = snap.length * base.uH + (snap.length - 1) * base.rowGap;
  return {
    ...base,
    boardW,
    boardH,
    W: boardW + base.margin * 2,
    H: boardH + base.margin * 2,
    rowW,
  };
}

// Strings shown in the Export popover.
export function buildExport(config: Config, board: Board | null): { link: string; embed: string } {
  const link = shareURL(config);
  const snap = board ? board.snapshot() : [[{ ch: " ", sep: false }]];
  const m = boardMetrics(snap);
  const ew = 640;
  const eh = Math.round((ew * m.H) / m.W);
  const embed = `<iframe src="${shareURL(
    config,
    "&e=1"
  )}" width="${ew}" height="${eh}" style="border:0;border-radius:16px;max-width:100%" title="Flipit" loading="lazy"></iframe>`;
  return { link, embed };
}

function drawBoardToCanvas(board: Board, palette: string, scale: number): HTMLCanvasElement {
  const snap = board.snapshot();
  const m = boardMetrics(snap);
  const pal = (PALETTES[palette] || PALETTES.onyx).vars;
  const FONT = '"Helvetica Neue", Arial, sans-serif';
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(m.W * scale);
  canvas.height = Math.round(m.H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Background (approx of the page's radial gradient).
  const bg = ctx.createLinearGradient(0, 0, 0, m.H);
  bg.addColorStop(0, pal["bg-1"]);
  bg.addColorStop(1, pal["bg-0"]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, m.W, m.H);

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };

  let y = m.margin;
  snap.forEach((cells) => {
    let x = m.margin + (m.boardW - m.rowW(cells)) / 2;
    cells.forEach((c) => {
      const w = c.sep ? m.sepW : m.uW;
      if (!c.sep) {
        ctx.save();
        rr(x, y, w, m.uH, m.rad);
        ctx.clip();
        const gt = ctx.createLinearGradient(0, y, 0, y + m.uH / 2);
        gt.addColorStop(0, pal["card-top"]);
        gt.addColorStop(1, pal["card-top-2"]);
        ctx.fillStyle = gt;
        ctx.fillRect(x, y, w, m.uH / 2);
        const gb = ctx.createLinearGradient(0, y + m.uH / 2, 0, y + m.uH);
        gb.addColorStop(0, pal["card-bot"]);
        gb.addColorStop(1, pal["card-bot-2"]);
        ctx.fillStyle = gb;
        ctx.fillRect(x, y + m.uH / 2, w, m.uH / 2);
        ctx.restore();
        // hinge
        ctx.fillStyle = pal["hinge"];
        ctx.fillRect(x, y + m.uH / 2 - 1, w, 2);
      }
      // glyph
      if (c.ch && c.ch !== " ") {
        ctx.fillStyle = pal["glyph"];
        ctx.font = `700 ${m.glyph}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.ch, x + w / 2, y + m.uH / 2 + m.glyph * 0.02);
      }
      x += w + m.gap;
    });
    y += m.uH + m.rowGap;
  });
  return canvas;
}

export function downloadImage(board: Board, config: Config): void {
  const canvas = drawBoardToCanvas(board, config.palette, 2);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flipit-" + config.mode + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
