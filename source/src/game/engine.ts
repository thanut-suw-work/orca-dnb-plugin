import {
  COLS,
  HIDDEN_ROWS,
  ROWS,
  type Action,
  type ActivePiece,
  type Cell,
  type ClearEvent,
  type FloatingText,
  type GamePhase,
  type HudState,
  type LineKind,
  type Particle,
  type PieceId,
  PIECE_IDS,
} from "./types";
import { cellsOf, kicksFor, PIECE_COLORS, spawnX, wrapRot } from "./pieces";
import { loadSave, persistHighScore } from "./save";
import {
  sfxHard,
  sfxHold,
  sfxLine,
  sfxLock,
  sfxMove,
  sfxOver,
  sfxRotate,
  sfxStart,
  sfxTetris,
} from "./audio";

const DAS_DELAY = 0.15;
const DAS_ARR = 0.033;
const LOCK_DELAY = 0.5;
const LOCK_RESET_CAP = 15;
const CLEAR_FLASH = 0.38;
const LINES_PER_LEVEL = 10;
const NEXT_COUNT = 5;

const LINE_SCORE = [0, 100, 300, 500, 800];
const TSPIN_SCORE = [400, 800, 1200, 1600];
const TSPIN_MINI_SCORE = [100, 200, 400];

function fallInterval(level: number): number {
  const table = [
    0.8, 0.72, 0.63, 0.55, 0.47, 0.38, 0.3, 0.22, 0.13, 0.1, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03,
    0.02, 0.015, 0.01,
  ];
  return table[Math.min(Math.max(level, 1) - 1, table.length - 1)] ?? 0.01;
}

function emptyBoard(): Cell[] {
  return new Array(COLS * ROWS).fill(0);
}

function idx(x: number, y: number): number {
  return y * COLS + x;
}

function shuffleBag(): PieceId[] {
  const bag: PieceId[] = [...PIECE_IDS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = a;
  }
  return bag;
}

export type EngineView = {
  board: Cell[];
  active: ActivePiece | null;
  ghostY: number;
  hold: PieceId | null;
  canHold: boolean;
  next: PieceId[];
  clearing: number[];
  clearT: number;
  particles: Particle[];
  floating: FloatingText | null;
  trauma: number;
  lockFlash: number;
  hardTrail: number;
  hud: HudState;
};

export class TetrisEngine {
  board: Cell[] = emptyBoard();
  active: ActivePiece | null = null;
  hold: PieceId | null = null;
  canHold = true;
  bag: PieceId[] = [];
  next: PieceId[] = [];
  phase: GamePhase = "ready";
  score = 0;
  highScore = 0;
  level = 1;
  lines = 0;
  combo = -1;
  b2b = false;
  lastClear: ClearEvent | null = null;
  lastWasRotate = false;
  lastKickIndex = 0;

  fallAccum = 0;
  lockTimer = 0;
  lockResets = 0;
  grounded = false;
  clearing: number[] = [];
  clearTimer = 0;

  dasDir = 0;
  dasTimer = 0;
  dasRepeating = false;
  heldLeft = false;
  heldRight = false;
  heldSoft = false;

  particles: Particle[] = [];
  floating: FloatingText | null = null;
  trauma = 0;
  lockFlash = 0;
  hardTrail = 0;
  hitstop = 0;
  reduceMotion = false;
  shakeEnabled = true;
  rumble: { mag: number; ms: number } | null = null;

  constructor() {
    const save = loadSave();
    this.highScore = save.highScore;
    this.shakeEnabled = save.shake;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.reduceMotion = true;
    }
  }

  start(): void {
    this.board = emptyBoard();
    this.active = null;
    this.hold = null;
    this.canHold = true;
    this.bag = [];
    this.next = [];
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = -1;
    this.b2b = false;
    this.lastClear = null;
    this.fallAccum = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.grounded = false;
    this.clearing = [];
    this.clearTimer = 0;
    this.particles = [];
    this.floating = null;
    this.trauma = 0;
    this.lockFlash = 0;
    this.hardTrail = 0;
    this.hitstop = 0;
    this.fillNext();
    this.spawn();
    this.phase = this.active ? "playing" : "over";
    sfxStart();
  }

  toMenu(): void {
    this.board = emptyBoard();
    this.active = null;
    this.hold = null;
    this.canHold = true;
    this.bag = [];
    this.next = [];
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = -1;
    this.b2b = false;
    this.lastClear = null;
    this.fallAccum = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.grounded = false;
    this.clearing = [];
    this.clearTimer = 0;
    this.particles = [];
    this.floating = null;
    this.trauma = 0;
    this.lockFlash = 0;
    this.hardTrail = 0;
    this.hitstop = 0;
    this.heldLeft = false;
    this.heldRight = false;
    this.heldSoft = false;
    this.phase = "ready";
  }

  pause(): void {
    if (this.phase === "playing" || this.phase === "clearing") this.phase = "paused";
  }

  resume(): void {
    if (this.phase === "paused") this.phase = this.clearing.length ? "clearing" : "playing";
  }

  press(action: Action): void {
    if (this.phase === "ready" || this.phase === "over") {
      if (action === "start" || action === "hard" || action === "rotCW") this.start();
      return;
    }
    if (action === "pause") {
      if (this.phase === "playing" || this.phase === "clearing") this.pause();
      else if (this.phase === "paused") this.resume();
      return;
    }
    if (action === "start") {
      if (this.phase === "paused") this.resume();
      return;
    }
    if (this.phase !== "playing") return;

    switch (action) {
      case "left":
        this.heldLeft = true;
        this.beginDas(-1);
        if (this.tryMove(-1, 0)) sfxMove();
        break;
      case "right":
        this.heldRight = true;
        this.beginDas(1);
        if (this.tryMove(1, 0)) sfxMove();
        break;
      case "soft":
        this.heldSoft = true;
        break;
      case "hard":
        this.hardDrop();
        break;
      case "rotCW":
        if (this.tryRotate(1)) sfxRotate();
        break;
      case "rotCCW":
        if (this.tryRotate(-1)) sfxRotate();
        break;
      case "rot180":
        if (this.tryRotate(2)) sfxRotate();
        break;
      case "hold":
        this.tryHold();
        break;
    }
  }

  release(action: Action): void {
    if (action === "left") {
      this.heldLeft = false;
      if (this.dasDir === -1) this.beginDas(this.heldRight ? 1 : 0);
    } else if (action === "right") {
      this.heldRight = false;
      if (this.dasDir === 1) this.beginDas(this.heldLeft ? -1 : 0);
    } else if (action === "soft") {
      this.heldSoft = false;
    }
  }

  clearHeld(): void {
    this.heldLeft = false;
    this.heldRight = false;
    this.heldSoft = false;
    this.dasDir = 0;
  }

  tick(dt: number): void {
    const cap = Math.min(dt, 0.1);
    this.updatePresentation(cap);

    if (this.phase === "paused" || this.phase === "ready" || this.phase === "over") return;

    if (this.hitstop > 0) {
      this.hitstop -= cap;
      return;
    }

    if (this.phase === "clearing") {
      this.clearTimer -= cap;
      if (this.clearTimer <= 0) this.finishClear();
      return;
    }

    this.tickDas(cap);
    this.tickGravity(cap);
    this.tickLock(cap);
  }

  getView(): EngineView {
    return {
      board: this.board,
      active: this.active,
      ghostY: this.ghostY(),
      hold: this.hold,
      canHold: this.canHold,
      next: this.next.slice(0, NEXT_COUNT),
      clearing: this.clearing,
      clearT: this.clearing.length ? 1 - this.clearTimer / CLEAR_FLASH : 0,
      particles: this.particles,
      floating: this.floating,
      trauma: this.trauma,
      lockFlash: this.lockFlash,
      hardTrail: this.hardTrail,
      hud: this.hud(),
    };
  }

  hud(): HudState {
    return {
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      lines: this.lines,
      combo: this.combo,
      hold: this.hold,
      canHold: this.canHold,
      next: this.next.slice(0, NEXT_COUNT),
      phase: this.phase,
      lastClear: this.lastClear,
    };
  }

  pieceCells(p: ActivePiece): { x: number; y: number }[] {
    return cellsOf(p.id, p.rot).map((c) => ({ x: p.x + c.x, y: p.y + c.y }));
  }

  private fillNext(): void {
    while (this.next.length < NEXT_COUNT + 1) {
      if (this.bag.length === 0) this.bag = shuffleBag();
      this.next.push(this.bag.shift()!);
    }
  }

  private takeNext(): PieceId {
    this.fillNext();
    return this.next.shift()!;
  }

  private spawn(id?: PieceId): boolean {
    const pieceId = id ?? this.takeNext();
    this.fillNext();
    const p: ActivePiece = { id: pieceId, x: spawnX(pieceId), y: HIDDEN_ROWS - 1, rot: 0 };
    if (!this.fits(p)) {
      this.active = p;
      this.gameOver();
      return false;
    }
    this.active = p;
    this.fallAccum = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.grounded = this.isGrounded();
    this.lastWasRotate = false;
    this.canHold = true;
    return true;
  }

  private fits(p: ActivePiece): boolean {
    for (const c of cellsOf(p.id, p.rot)) {
      const x = p.x + c.x;
      const y = p.y + c.y;
      if (x < 0 || x >= COLS || y >= ROWS || y < 0) return false;
      if (this.board[idx(x, y)]) return false;
    }
    return true;
  }

  private isGrounded(): boolean {
    if (!this.active) return false;
    return !this.fits({ ...this.active, y: this.active.y + 1 });
  }

  private ghostY(): number {
    if (!this.active) return 0;
    let y = this.active.y;
    while (this.fits({ ...this.active, y: y + 1 })) y++;
    return y;
  }

  private tryMove(dx: number, dy: number): boolean {
    if (!this.active) return false;
    const next = { ...this.active, x: this.active.x + dx, y: this.active.y + dy };
    if (!this.fits(next)) return false;
    this.active = next;
    this.lastWasRotate = false;
    this.onShifted();
    return true;
  }

  private tryRotate(dir: 1 | -1 | 2): boolean {
    if (!this.active) return false;
    const from = this.active.rot;
    const to = wrapRot(from + dir);
    const kicks = kicksFor(this.active.id, from, to);
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i]!;
      const next: ActivePiece = {
        ...this.active,
        rot: to,
        x: this.active.x + kx,
        y: this.active.y - ky,
      };
      if (this.fits(next)) {
        this.active = next;
        this.lastWasRotate = true;
        this.lastKickIndex = i;
        this.onShifted();
        return true;
      }
    }
    return false;
  }

  private onShifted(): void {
    const nowGrounded = this.isGrounded();
    if (nowGrounded) {
      if (this.lockResets < LOCK_RESET_CAP) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    } else {
      this.lockTimer = 0;
    }
    this.grounded = nowGrounded;
  }

  private tryHold(): void {
    if (!this.active || !this.canHold) return;
    const current = this.active.id;
    sfxHold();
    if (this.hold == null) {
      this.hold = current;
      this.spawn();
    } else {
      const swap = this.hold;
      this.hold = current;
      this.spawn(swap);
    }
    this.canHold = false;
  }

  private beginDas(dir: number): void {
    this.dasDir = dir;
    this.dasTimer = 0;
    this.dasRepeating = false;
  }

  private tickDas(dt: number): void {
    if (this.dasDir === 0) return;
    this.dasTimer += dt;
    if (!this.dasRepeating) {
      if (this.dasTimer >= DAS_DELAY) {
        this.dasRepeating = true;
        this.dasTimer -= DAS_DELAY;
        if (this.tryMove(this.dasDir, 0)) sfxMove();
      }
    } else {
      while (this.dasTimer >= DAS_ARR) {
        this.dasTimer -= DAS_ARR;
        if (!this.tryMove(this.dasDir, 0)) break;
      }
    }
  }

  private tickGravity(dt: number): void {
    if (!this.active) return;
    const interval = this.heldSoft ? Math.min(0.04, fallInterval(this.level) / 16) : fallInterval(this.level);
    this.fallAccum += dt;
    while (this.fallAccum >= interval) {
      this.fallAccum -= interval;
      if (this.tryMove(0, 1)) {
        if (this.heldSoft) this.score += 1;
        this.grounded = this.isGrounded();
      } else {
        this.grounded = true;
        break;
      }
    }
  }

  private tickLock(dt: number): void {
    if (!this.active || !this.grounded) return;
    this.lockTimer += dt;
    if (this.lockTimer >= LOCK_DELAY) this.lock();
  }

  private hardDrop(): void {
    if (!this.active) return;
    let dropped = 0;
    while (this.tryMove(0, 1)) dropped++;
    this.score += dropped * 2;
    this.hardTrail = 1;
    sfxHard();
    this.addTrauma(dropped > 8 ? 0.35 : 0.18);
    this.queueRumble(0.45, 55);
    this.lock();
  }

  private lock(): void {
    if (!this.active) return;
    const piece = this.active;
    for (const c of this.pieceCells(piece)) {
      if (c.y >= 0 && c.y < ROWS && c.x >= 0 && c.x < COLS) {
        this.board[idx(c.x, c.y)] = piece.id;
      }
    }
    this.lockFlash = 1;
    this.active = null;
    sfxLock();

    const rows = this.fullRows();
    const tspin = this.detectTspin(piece, rows.length);
    if (rows.length) {
      this.beginClear(rows, tspin);
    } else {
      this.combo = -1;
      this.lastClear = null;
      if (!this.spawn()) return;
    }
  }

  private fullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      let full = true;
      for (let x = 0; x < COLS; x++) {
        if (!this.board[idx(x, y)]) {
          full = false;
          break;
        }
      }
      if (full) rows.push(y);
    }
    return rows;
  }

  /** Corners of the T's 3×3 (center at piece origin + (1,1)). */
  private detectTspin(piece: ActivePiece, lines: number): "full" | "mini" | null {
    if (piece.id !== "T" || !this.lastWasRotate) return null;
    const cx = piece.x + 1;
    const cy = piece.y + 1;
    const corners = [
      { x: cx - 1, y: cy - 1 },
      { x: cx + 1, y: cy - 1 },
      { x: cx - 1, y: cy + 1 },
      { x: cx + 1, y: cy + 1 },
    ];
    const occupied = corners.map((c) => c.x < 0 || c.x >= COLS || c.y >= ROWS || c.y < 0 || !!this.board[idx(c.x, c.y)]);
    const n = occupied.filter(Boolean).length;
    if (n < 3) return null;
    const facing: [number, number][] = [
      [0, 1],
      [1, 3],
      [2, 3],
      [0, 2],
    ];
    const pair = facing[piece.rot]!;
    const front = (occupied[pair[0]] ? 1 : 0) + (occupied[pair[1]] ? 1 : 0);
    if (front === 2 || this.lastKickIndex === 4) return "full";
    if (lines > 0) return "mini";
    return "mini";
  }

  private beginClear(rows: number[], tspin: "full" | "mini" | null): void {
    this.clearing = rows;
    this.clearTimer = this.reduceMotion ? 0.12 : CLEAR_FLASH;
    this.phase = "clearing";

    const n = rows.length;
    let kind: LineKind = n === 4 ? "tetris" : n === 3 ? "triple" : n === 2 ? "double" : "single";
    let pts = (LINE_SCORE[n] ?? 0) * this.level;
    if (tspin === "full") {
      kind = "tspin";
      pts = (TSPIN_SCORE[n] ?? TSPIN_SCORE[0]!) * this.level;
    } else if (tspin === "mini") {
      kind = "tspin-mini";
      pts = (TSPIN_MINI_SCORE[n] ?? TSPIN_MINI_SCORE[0]!) * this.level;
    }

    const difficult = n === 4 || tspin != null;
    const isB2b = difficult && this.b2b;
    if (isB2b) pts = Math.floor(pts * 1.5);
    this.b2b = difficult;

    this.combo += 1;
    if (this.combo > 0) pts += 50 * this.combo * this.level;

    this.score += pts;
    this.lines += n;
    this.level = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
    this.lastClear = { kind, lines: n, score: pts, b2b: isB2b, combo: this.combo, rows };

    const label =
      tspin === "full"
        ? n === 0
          ? "T-SPIN"
          : `T-SPIN ${n === 1 ? "SINGLE" : n === 2 ? "DOUBLE" : "TRIPLE"}`
        : tspin === "mini"
          ? "T-SPIN MINI"
          : n === 4
            ? "TETRIS"
            : n === 3
              ? "TRIPLE"
              : n === 2
                ? "DOUBLE"
                : "SINGLE";
    this.floating = {
      text: label,
      sub: isB2b ? "BACK TO BACK" : this.combo > 0 ? `COMBO ×${this.combo}` : undefined,
      life: 1.1,
      maxLife: 1.1,
    };

    this.spawnClearParticles(rows);
    if (n === 4) {
      sfxTetris();
      this.addTrauma(0.72);
      this.hitstop = this.reduceMotion ? 0 : 0.07;
      this.queueRumble(0.95, 200);
    } else {
      sfxLine(n);
      this.addTrauma(0.18 + n * 0.08);
      this.queueRumble(0.4 + n * 0.1, 90);
    }
  }

  private finishClear(): void {
    const remove = new Set(this.clearing);
    const next: Cell[] = emptyBoard();
    let writeY = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (remove.has(y)) continue;
      for (let x = 0; x < COLS; x++) next[idx(x, writeY)] = this.board[idx(x, y)]!;
      writeY--;
    }
    this.board = next;
    this.clearing = [];
    this.phase = "playing";
    if (!this.spawn()) return;
  }

  private spawnClearParticles(rows: number[]): void {
    if (this.reduceMotion) return;
    for (const y of rows) {
      for (let x = 0; x < COLS; x++) {
        const cell = this.board[idx(x, y)];
        if (!cell) continue;
        const color = PIECE_COLORS[cell];
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: x + 0.5,
            y: y + 0.5,
            vx: (Math.random() - 0.5) * 10,
            vy: -2 - Math.random() * 5,
            life: 0.45 + Math.random() * 0.35,
            maxLife: 0.8,
            color,
            size: 0.18 + Math.random() * 0.2,
          });
        }
      }
    }
  }

  private gameOver(): void {
    this.phase = "over";
    this.active = null;
    this.highScore = persistHighScore(this.score);
    sfxOver();
    this.addTrauma(0.5);
    this.queueRumble(0.75, 280);
  }

  takeRumble(): { mag: number; ms: number } | null {
    const pulse = this.rumble;
    this.rumble = null;
    return pulse;
  }

  private queueRumble(mag: number, ms: number): void {
    this.rumble = { mag, ms };
  }

  private addTrauma(amount: number): void {
    if (!this.shakeEnabled || this.reduceMotion) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private updatePresentation(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.lockFlash = Math.max(0, this.lockFlash - dt * 4);
    this.hardTrail = Math.max(0, this.hardTrail - dt * 5);
    if (this.floating) {
      this.floating.life -= dt;
      if (this.floating.life <= 0) this.floating = null;
    }
    if (this.particles.length) {
      const g = 14;
      const next: Particle[] = [];
      for (const p of this.particles) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vy += g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        next.push(p);
      }
      this.particles = next;
    }
  }
}
