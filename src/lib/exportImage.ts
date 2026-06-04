import { Board, Snapshot } from "./flipEngine";
import { PALETTES } from "./palettes";
import { FONT_BY_KEY } from "./fonts";
import { LED_BY_KEY, LED_COLORS } from "./led";
import { SEG_POLYS, litSegments, CHAR_VB } from "./segments";
import { pixelFamily, pixelColorOn } from "./pixel";
import { getDisplayState } from "./display";
import { Config, shareURL } from "./config";

const F = 150; // fixed font-size space for export geometry
const PIXEL_LINE_H = F * 1.05;
const PIXEL_ROW_GAP = 0.12 * F;
const PIXEL_DIGIT_W = 0.66 * F;
const PIXEL_NARROW_W = 0.34 * F;

function measurePixelWidth(lines: string[], family: string): number {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `${F}px "${family}", monospace`;
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  return maxW || F;
}

function pixelGridWidth(line: string): number {
  let w = 0;
  for (const ch of line) w += ch === ":" || ch === " " ? PIXEL_NARROW_W : PIXEL_DIGIT_W;
  return w;
}

// ---------- Embed/iframe aspect ----------
function contentDims(config: Config): { W: number; H: number } {
  const { lines } = getDisplayState(config);
  const rows = lines.length || 1;
  const margin = 0.6 * F;
  if (config.style === "pixel") {
    const grid = config.mode !== "message";
    const maxW = grid
      ? Math.max(1, ...lines.map(pixelGridWidth))
      : measurePixelWidth(lines, pixelFamily(config.pixelVariant));
    return {
      W: maxW + 2 * margin,
      H: rows * PIXEL_LINE_H + (rows - 1) * PIXEL_ROW_GAP + 2 * margin,
    };
  }
  const cols = Math.max(1, ...lines.map((l) => [...l].length));
  if (config.style === "led") {
    const cw = 0.64 * F;
    const ch = F;
    const gap = 0.06 * F;
    const rg = 0.18 * F;
    return {
      W: cols * cw + (cols - 1) * gap + 2 * margin,
      H: rows * ch + (rows - 1) * rg + 2 * margin,
    };
  }
  const uw = 0.78 * F;
  const uh = 1.12 * F;
  const gap = 0.09 * F;
  const rg = 0.16 * F;
  return {
    W: cols * uw + (cols - 1) * gap + 2 * margin,
    H: rows * uh + (rows - 1) * rg + 2 * margin,
  };
}

// Strings shown in the Export popover.
export function buildExport(config: Config): { link: string; embed: string } {
  const link = shareURL(config);
  const { W, H } = contentDims(config);
  const ew = 640;
  const eh = Math.round((ew * H) / W);
  const embed = `<iframe src="${shareURL(
    config,
    "&e=1"
  )}" width="${ew}" height="${eh}" style="border:0;border-radius:16px;max-width:100%" title="Flipit" loading="lazy"></iframe>`;
  return { link, embed };
}

// ---------- Split-flap board ----------
interface Metrics {
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

function boardMetrics(snap: Snapshot): Metrics {
  const base = {
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
  return { ...base, boardW, boardH, W: boardW + base.margin * 2, H: boardH + base.margin * 2, rowW };
}

function drawBoardToCanvas(board: Board, config: Config, scale: number): HTMLCanvasElement {
  const snap = board.snapshot();
  const m = boardMetrics(snap);
  const pal = (PALETTES[config.palette] || PALETTES.onyx).vars;
  const fnt = FONT_BY_KEY[config.font] || FONT_BY_KEY.default;
  const glyphPx = m.glyph * fnt.scale;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(m.W * scale);
  canvas.height = Math.round(m.H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, 0, m.H);
  bg.addColorStop(0, pal["bg-1"]);
  bg.addColorStop(1, pal["bg-0"]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, m.W, m.H);

  let y = m.margin;
  snap.forEach((cells) => {
    let x = m.margin + (m.boardW - m.rowW(cells)) / 2;
    cells.forEach((c) => {
      const w = c.sep ? m.sepW : m.uW;
      if (!c.sep) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, m.uH, m.rad);
        ctx.clip();
        const gt = ctx.createLinearGradient(0, y, 0, y + m.uH / 2);
        gt.addColorStop(0, pal["card-bot-2"]);
        gt.addColorStop(1, pal["card-bot"]);
        ctx.fillStyle = gt;
        ctx.fillRect(x, y, w, m.uH / 2);
        const gb = ctx.createLinearGradient(0, y + m.uH / 2, 0, y + m.uH);
        gb.addColorStop(0, pal["card-top-2"]);
        gb.addColorStop(1, pal["card-top"]);
        ctx.fillStyle = gb;
        ctx.fillRect(x, y + m.uH / 2, w, m.uH / 2);
        ctx.restore();
        ctx.fillStyle = pal["hinge"];
        ctx.fillRect(x, y + m.uH / 2 - 1, w, 2);
      }
      if (c.ch && c.ch !== " ") {
        ctx.fillStyle = pal["glyph"];
        ctx.font = `${fnt.weight} ${glyphPx}px ${fnt.stack}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.ch, x + w / 2, y + m.uH / 2 + glyphPx * 0.02);
      }
      x += w + m.gap;
    });
    y += m.uH + m.rowGap;
  });
  return canvas;
}

// ---------- LED (14-segment) board ----------
function drawLedToCanvas(config: Config, scale: number): HTMLCanvasElement {
  const { lines } = getDisplayState(config);
  const led = LED_BY_KEY[config.ledColor] || LED_COLORS[0];
  const cw = 0.64 * F;
  const chh = F;
  const gap = 0.06 * F;
  const rg = 0.18 * F;
  const margin = 0.6 * F;
  const cols = Math.max(1, ...lines.map((l) => [...l].length));
  const rows = lines.length || 1;
  const boardW = cols * cw + (cols - 1) * gap;
  const boardH = rows * chh + (rows - 1) * rg;
  const W = boardW + 2 * margin;
  const H = boardH + 2 * margin;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#121214");
  bg.addColorStop(1, "#070708");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const sx = cw / CHAR_VB.w;
  const sy = chh / CHAR_VB.h;
  const glow = cw * 0.06;

  const drawChar = (ch: string, ox: number, oy: number) => {
    const path = (pts: number[][]) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const X = ox + p[0] * sx;
        const Y = oy + p[1] * sy;
        if (i) ctx.lineTo(X, Y);
        else ctx.moveTo(X, Y);
      });
      ctx.closePath();
    };
    const dot = (vx: number, vy: number) => {
      ctx.beginPath();
      ctx.arc(ox + vx * sx, oy + vy * sy, 4.5 * sx, 0, Math.PI * 2);
      ctx.fill();
    };

    if (ch === ":") {
      ctx.fillStyle = led.on;
      ctx.shadowColor = led.glow;
      ctx.shadowBlur = glow;
      dot(32, 36);
      dot(32, 64);
      ctx.shadowBlur = 0;
      return;
    }

    const lit = litSegments(ch);
    // ghost pass
    ctx.shadowBlur = 0;
    ctx.fillStyle = led.off;
    for (const s of SEG_POLYS) {
      path(s.pts);
      ctx.fill();
    }
    // lit pass (glow)
    ctx.fillStyle = led.on;
    ctx.shadowColor = led.glow;
    ctx.shadowBlur = glow;
    for (const s of SEG_POLYS) {
      if (lit.has(s.key)) {
        path(s.pts);
        ctx.fill();
      }
    }
    if (ch === ".") dot(58, 92);
    ctx.shadowBlur = 0;
  };

  let y = margin;
  for (const line of lines) {
    const chars = [...line];
    const rowW = chars.length * cw + (chars.length - 1) * gap;
    let x = margin + (boardW - rowW) / 2;
    for (const ch of chars) {
      drawChar(ch, x, y);
      x += cw + gap;
    }
    y += chh + rg;
  }
  return canvas;
}

// ---------- Geist Pixel board ----------
function drawPixelToCanvas(config: Config, scale: number): HTMLCanvasElement {
  const { lines } = getDisplayState(config);
  const family = pixelFamily(config.pixelVariant);
  const grid = config.mode !== "message";
  const margin = 0.6 * F;
  const maxW = grid
    ? Math.max(1, ...lines.map(pixelGridWidth))
    : measurePixelWidth(lines, family);
  const rows = lines.length || 1;
  const W = maxW + 2 * margin;
  const H = rows * PIXEL_LINE_H + (rows - 1) * PIXEL_ROW_GAP + 2 * margin;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#161618");
  bg.addColorStop(1, "#08080a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.font = `${F}px "${family}", monospace`;
  ctx.fillStyle = pixelColorOn(config.pixelColor);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let y = margin + PIXEL_LINE_H / 2;
  for (const line of lines) {
    if (grid) {
      const rowW = pixelGridWidth(line);
      let x = margin + (maxW - rowW) / 2;
      for (const ch of line) {
        const cw = ch === ":" || ch === " " ? PIXEL_NARROW_W : PIXEL_DIGIT_W;
        ctx.fillText(ch, x + cw / 2, y);
        x += cw;
      }
    } else {
      ctx.fillText(line, W / 2, y);
    }
    y += PIXEL_LINE_H + PIXEL_ROW_GAP;
  }
  return canvas;
}

export async function downloadImage(config: Config, board: Board | null): Promise<void> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
  const canvas =
    config.style === "led"
      ? drawLedToCanvas(config, 2)
      : config.style === "pixel"
        ? drawPixelToCanvas(config, 2)
        : board
          ? drawBoardToCanvas(board, config, 2)
          : null;
  if (!canvas) return;
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
