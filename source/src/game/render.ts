import { COLS, HIDDEN_ROWS, ROWS, VISIBLE_ROWS } from "./types";
import { cellsOf, PIECE_COLORS } from "./pieces";
import type { EngineView } from "./engine";
import type { PieceId } from "./types";

const WELL_BG = "#0c0c0e";
const GRID = "rgba(244,244,245,0.045)";
const FRAME = "rgba(244,244,245,0.14)";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  opts: { ghost?: boolean; flash?: number; alpha?: number } = {},
): void {
  const pad = size * 0.06;
  const s = size - pad * 2;
  const px = x + pad;
  const py = y + pad;
  const r = s * 0.14;
  const alpha = opts.alpha ?? 1;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (opts.ghost) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.25, size * 0.07);
    ctx.globalAlpha = 0.42 * alpha;
    roundRect(ctx, px, py, s, s, r);
    ctx.stroke();
    ctx.restore();
    return;
  }

  roundRect(ctx, px, py, s, s, r);
  const g = ctx.createLinearGradient(px, py, px, py + s);
  g.addColorStop(0, shade(color, 28));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, -36));
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  roundRect(ctx, px, py, s, s, r);
  ctx.clip();
  const hi = ctx.createLinearGradient(px, py, px, py + s * 0.45);
  hi.addColorStop(0, "rgba(255,255,255,0.28)");
  hi.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hi;
  ctx.fillRect(px, py, s, s * 0.5);
  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = Math.max(1, size * 0.04);
  roundRect(ctx, px + 0.5, py + 0.5, s - 1, s - 1, r);
  ctx.stroke();

  if (opts.flash && opts.flash > 0) {
    ctx.globalAlpha = opts.flash * 0.7;
    roundRect(ctx, px, py, s, s, r);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.restore();
}

export type Layout = {
  originX: number;
  originY: number;
  cell: number;
  wellW: number;
  wellH: number;
};

export function computeLayout(w: number, h: number): Layout {
  const pad = Math.min(w, h) * 0.04;
  const cell = Math.floor(Math.min((w - pad * 2) / COLS, (h - pad * 2) / VISIBLE_ROWS));
  const wellW = cell * COLS;
  const wellH = cell * VISIBLE_ROWS;
  return {
    originX: Math.floor((w - wellW) / 2),
    originY: Math.floor((h - wellH) / 2),
    cell,
    wellW,
    wellH,
  };
}

export function renderWell(
  ctx: CanvasRenderingContext2D,
  view: EngineView,
  w: number,
  h: number,
  dpr: number,
): Layout {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const layout = computeLayout(w, h);
  const { originX, originY, cell, wellW, wellH } = layout;

  const shake = view.trauma * view.trauma;
  const t = performance.now() / 1000;
  const ox = shake * 7 * Math.sin(t * 47);
  const oy = shake * 7 * Math.cos(t * 41);
  ctx.save();
  ctx.translate(ox, oy);

  ctx.fillStyle = WELL_BG;
  roundRect(ctx, originX, originY, wellW, wellH, 6);
  ctx.fill();

  ctx.save();
  roundRect(ctx, originX, originY, wellW, wellH, 6);
  ctx.clip();

  ctx.beginPath();
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    const px = originX + x * cell + 0.5;
    ctx.moveTo(px, originY);
    ctx.lineTo(px, originY + wellH);
  }
  for (let y = 1; y < VISIBLE_ROWS; y++) {
    const py = originY + y * cell + 0.5;
    ctx.moveTo(originX, py);
    ctx.lineTo(originX + wellW, py);
  }
  ctx.stroke();

  const cellY = (row: number) => originY + (row - HIDDEN_ROWS) * cell;
  const inView = (row: number) => row >= HIDDEN_ROWS && row < ROWS;

  const flashRows = new Set(view.clearing);
  const flashPulse = view.clearing.length
    ? 0.45 + 0.55 * Math.abs(Math.sin(view.clearT * Math.PI * 4))
    : 0;

  for (let y = HIDDEN_ROWS; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cellId = view.board[y * COLS + x];
      if (!cellId) continue;
      drawBlock(ctx, originX + x * cell, cellY(y), cell, PIECE_COLORS[cellId], {
        flash: flashRows.has(y) ? flashPulse : 0,
      });
    }
  }

  if (view.active && view.hud.phase === "playing") {
    const ghostY = view.ghostY;
    if (ghostY !== view.active.y) {
      for (const c of cellsOf(view.active.id, view.active.rot)) {
        const gy = view.active.y + c.y + (ghostY - view.active.y);
        if (!inView(gy)) continue;
        drawBlock(
          ctx,
          originX + (view.active.x + c.x) * cell,
          cellY(gy),
          cell,
          PIECE_COLORS[view.active.id],
          { ghost: true },
        );
      }
    }

    if (view.hardTrail > 0) {
      ctx.globalAlpha = view.hardTrail * 0.25;
      for (const c of cellsOf(view.active.id, view.active.rot)) {
        const x = originX + (view.active.x + c.x) * cell + cell * 0.3;
        const y0 = cellY(view.active.y + c.y);
        const y1 = cellY(ghostY + c.y);
        ctx.fillStyle = PIECE_COLORS[view.active.id];
        ctx.fillRect(x, Math.min(y0, y1), cell * 0.4, Math.abs(y1 - y0));
      }
      ctx.globalAlpha = 1;
    }

    for (const c of cellsOf(view.active.id, view.active.rot)) {
      const y = view.active.y + c.y;
      if (!inView(y) && y < HIDDEN_ROWS) {
        const vis = cellY(HIDDEN_ROWS);
        const overflow = (HIDDEN_ROWS - y) * cell;
        if (overflow < cell) {
          /* peek into top of well */
        }
      }
      if (y >= ROWS) continue;
      const py = cellY(y);
      if (py + cell < originY) continue;
      drawBlock(
        ctx,
        originX + (view.active.x + c.x) * cell,
        py,
        cell,
        PIECE_COLORS[view.active.id],
        { flash: view.lockFlash },
      );
    }
  }

  for (const p of view.particles) {
    if (!inView(p.y) && p.y < HIDDEN_ROWS) continue;
    const px = originX + p.x * cell;
    const py = cellY(p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    const s = p.size * cell;
    ctx.fillRect(px - s / 2, py - s / 2, s, s);
  }
  ctx.globalAlpha = 1;

  if (view.floating) {
    const f = view.floating;
    const a = Math.min(1, f.life / 0.2, f.life > 0.3 ? 1 : f.life / 0.3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4f4f5";
    ctx.font = `600 ${Math.max(14, cell * 0.72)}px "Syne", system-ui, sans-serif`;
    const cx = originX + wellW / 2;
    const cy = originY + wellH * 0.38;
    ctx.fillText(f.text, cx, cy);
    if (f.sub) {
      ctx.font = `500 ${Math.max(10, cell * 0.38)}px "IBM Plex Sans", system-ui, sans-serif`;
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(f.sub, cx, cy + cell * 0.7);
    }
    ctx.restore();
  }

  ctx.restore();

  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 1;
  roundRect(ctx, originX + 0.5, originY + 0.5, wellW - 1, wellH - 1, 6);
  ctx.stroke();

  ctx.restore();
  return layout;
}

export function drawMini(
  ctx: CanvasRenderingContext2D,
  id: PieceId | null,
  size: number,
  faded = false,
): void {
  ctx.clearRect(0, 0, size, size);
  if (!id) return;
  const cells = cellsOf(id, 0);
  let minX = 4,
    minY = 4,
    maxX = 0,
    maxY = 0;
  for (const c of cells) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const cell = Math.floor(size / 5);
  const ox = Math.floor((size - bw * cell) / 2);
  const oy = Math.floor((size - bh * cell) / 2);
  for (const c of cells) {
    drawBlock(ctx, ox + (c.x - minX) * cell, oy + (c.y - minY) * cell, cell, PIECE_COLORS[id], {
      alpha: faded ? 0.35 : 1,
    });
  }
}
