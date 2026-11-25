export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export const PIECE_IDS = ["I", "O", "T", "S", "Z", "J", "L"] as const;
export type PieceId = (typeof PIECE_IDS)[number];

export type Rot = 0 | 1 | 2 | 3;

export type Cell = PieceId | 0;

export type Point = { x: number; y: number };

export type ActivePiece = {
  id: PieceId;
  x: number;
  y: number;
  rot: Rot;
};

export type LineKind = "single" | "double" | "triple" | "tetris" | "tspin" | "tspin-mini" | "none";

export type ClearEvent = {
  kind: LineKind;
  lines: number;
  score: number;
  b2b: boolean;
  combo: number;
  rows: number[];
};

export type GamePhase = "ready" | "playing" | "paused" | "clearing" | "over";

export type Action =
  | "left"
  | "right"
  | "soft"
  | "hard"
  | "rotCW"
  | "rotCCW"
  | "rot180"
  | "hold"
  | "pause"
  | "start";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export type FloatingText = {
  text: string;
  sub?: string;
  life: number;
  maxLife: number;
};

export type HudState = {
  score: number;
  highScore: number;
  level: number;
  lines: number;
  combo: number;
  hold: PieceId | null;
  canHold: boolean;
  next: PieceId[];
  phase: GamePhase;
  lastClear: ClearEvent | null;
};
