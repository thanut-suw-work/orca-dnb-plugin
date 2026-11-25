type Bus = GainNode;

let ctx: AudioContext | null = null;
let master: Bus | null = null;
let sfx: Bus | null = null;
let unlocked = false;
let muted = false;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.connect(master);
    master.connect(ctx.destination);
    master.gain.value = muted ? 0 : 0.7;
    sfx.gain.value = 0.85;
  }
  return ctx;
}

export function unlockAudio(): void {
  const ac = ensure();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  unlocked = true;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (master && ctx) {
    master.gain.setTargetAtTime(next ? 0 : 0.7, ctx.currentTime, 0.03);
  }
}

export function isMuted(): boolean {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.12,
  slide?: number,
): void {
  const ac = ctx;
  if (!ac || !sfx || !unlocked || muted) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime);
  if (slide != null) {
    o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ac.currentTime + dur);
  }
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0008, ac.currentTime + dur);
  o.connect(g);
  g.connect(sfx);
  o.start();
  o.stop(ac.currentTime + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

function noise(dur: number, gain = 0.08, hp = 800): void {
  const ac = ctx;
  if (!ac || !sfx || !unlocked || muted) return;
  const n = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = n.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = n;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0008, ac.currentTime + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(sfx);
  src.start();
  src.stop(ac.currentTime + dur);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

const jitter = (n: number, amt = 0.08) => n * (1 + (Math.random() * 2 - 1) * amt);

export const sfxMove = () => tone(jitter(420), 0.04, "square", 0.04);
export const sfxRotate = () => tone(jitter(620), 0.055, "square", 0.05);
export const sfxLock = () => {
  tone(180, 0.09, "triangle", 0.1, 90);
  noise(0.05, 0.04, 400);
};
export const sfxHard = () => {
  tone(140, 0.12, "sawtooth", 0.08, 60);
  noise(0.08, 0.07, 200);
};
export const sfxHold = () => tone(jitter(380), 0.07, "sine", 0.06);
export const sfxLine = (n: number) => {
  const base = 420 + n * 80;
  tone(base, 0.14, "square", 0.08);
  tone(base * 1.5, 0.16, "triangle", 0.06);
};
export const sfxTetris = () => {
  tone(520, 0.18, "square", 0.1);
  tone(780, 0.22, "triangle", 0.08);
  tone(1040, 0.28, "sine", 0.06);
  noise(0.16, 0.08, 300);
};
export const sfxOver = () => {
  tone(320, 0.45, "sawtooth", 0.08, 80);
  tone(240, 0.5, "triangle", 0.07, 60);
};
export const sfxStart = () => {
  tone(440, 0.1, "square", 0.06);
  tone(660, 0.14, "triangle", 0.05);
};

export function resumeOnVisible(): void {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx?.state === "suspended") {
      void ctx.resume();
    }
  });
}
