const KEY = "well.save.v1";
const SAVE_VERSION = 1;

export type SaveData = {
  version: number;
  highScore: number;
  muted: boolean;
  shake: boolean;
};

const defaults: SaveData = {
  version: SAVE_VERSION,
  highScore: 0,
  muted: false,
  shake: true,
};

function migrate(raw: Partial<SaveData> & { version?: number }): SaveData {
  const s: SaveData = { ...defaults, ...raw, version: raw.version ?? 0 };
  if (s.version < 1) s.version = 1;
  return s;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return migrate(parsed);
  } catch {
    return { ...defaults };
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode / quota */
  }
}

export function persistHighScore(score: number): number {
  const save = loadSave();
  if (score > save.highScore) {
    save.highScore = score;
    writeSave(save);
  }
  return save.highScore;
}

export function persistSettings(partial: Partial<Pick<SaveData, "muted" | "shake">>): SaveData {
  const save = { ...loadSave(), ...partial };
  writeSave(save);
  return save;
}
