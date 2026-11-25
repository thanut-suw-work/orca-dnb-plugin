import { useCallback, useEffect, useRef, useState } from "react";
import { TetrisEngine } from "@/game/engine";
import { renderWell } from "@/game/render";
import { persistSettings, loadSave } from "@/game/save";
import {
  isMuted,
  resumeOnVisible,
  setMuted,
  unlockAudio,
} from "@/game/audio";
import { registerPwa } from "@/lib/pwa";
import type { Action, HudState } from "@/game/types";
import { MenuOverlay, OverOverlay, PauseOverlay, type MenuTick } from "./Overlays";
import { CompactHud, LeftHud, RightHud } from "./Hud";
import { TouchPad } from "./TouchPad";
import { APP_VERSION } from "@/game/version";

const KEY_MAP: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowDown: "soft",
  KeyS: "soft",
  Space: "hard",
  ArrowUp: "rotCW",
  KeyX: "rotCW",
  KeyW: "rotCW",
  KeyZ: "rotCCW",
  ControlLeft: "rotCCW",
  ControlRight: "rotCCW",
  KeyQ: "rot180",
  KeyC: "hold",
  ShiftLeft: "hold",
  ShiftRight: "hold",
  Escape: "pause",
  KeyP: "pause",
  Enter: "start",
};

const HELD: Action[] = ["left", "right", "soft"];
const GAME_CODES = new Set(Object.keys(KEY_MAP));

function emptyHud(): HudState {
  return {
    score: 0,
    highScore: 0,
    level: 1,
    lines: 0,
    combo: -1,
    hold: null,
    canHold: true,
    next: [],
    phase: "ready",
    lastClear: null,
  };
}

export function TetrisApp() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [hud, setHud] = useState<HudState>(emptyHud);
  const [muted, setMutedState] = useState(false);
  const [shake, setShake] = useState(true);
  const [menuNav, setMenuNav] = useState<MenuTick>({
    seq: 0,
    up: false,
    down: false,
    confirm: false,
    back: false,
  });

  useEffect(() => {
    const save = loadSave();
    setMutedState(save.muted);
    setShake(save.shake);
    setMuted(save.muted);
    resumeOnVisible();
    const unregPwa = registerPwa();
    const engine = new TetrisEngine();
    engine.shakeEnabled = save.shake;
    engineRef.current = engine;

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      engine.tick(dt);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (canvas && wrap) {
        const rect = wrap.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cssW = Math.max(1, Math.floor(rect.width));
        const cssH = Math.max(1, Math.floor(rect.height));
        if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
          canvas.width = Math.floor(cssW * dpr);
          canvas.height = Math.floor(cssH * dpr);
        }
        const ctx = canvas.getContext("2d");
        if (ctx) renderWell(ctx, engine.getView(), cssW, cssH, dpr);
      }
      const next = engine.hud();
      setHud((prev) => (hudEqual(prev, next) ? prev : { ...next }));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      unregPwa();
    };
  }, []);

  const boot = useCallback(() => {
    unlockAudio();
    canvasRef.current?.focus({ preventScroll: true });
  }, []);

  const press = useCallback((action: Action) => {
    boot();
    engineRef.current?.press(action);
  }, [boot]);

  const release = useCallback((action: Action) => {
    engineRef.current?.release(action);
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const eng = engineRef.current;
      const inMenu = eng && (eng.phase === "ready" || eng.phase === "paused" || eng.phase === "over");
      if (inMenu) {
        if (e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          setMenuNav((p) => ({ seq: p.seq + 1, up: true, down: false, confirm: false, back: false }));
          return;
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
          e.preventDefault();
          setMenuNav((p) => ({ seq: p.seq + 1, up: false, down: true, confirm: false, back: false }));
          return;
        }
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          setMenuNav((p) => ({ seq: p.seq + 1, up: false, down: false, confirm: true, back: false }));
          return;
        }
      }
      const action = KEY_MAP[e.code];
      if (!action) return;
      if (GAME_CODES.has(e.code)) e.preventDefault();
      keysRef.current.add(e.code);
      press(action);
    };
    const onUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      keysRef.current.delete(e.code);
      if (HELD.includes(action)) release(action);
    };
    const clear = () => {
      keysRef.current.clear();
      engineRef.current?.clearHeld();
    };
    const onHidden = () => {
      if (document.hidden) {
        clear();
        const eng = engineRef.current;
        if (eng && (eng.phase === "playing" || eng.phase === "clearing")) eng.pause();
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [press, release]);

  const start = () => {
    boot();
    engineRef.current?.start();
  };
  const resume = () => engineRef.current?.resume();
  const pause = () => {
    const eng = engineRef.current;
    if (!eng) return;
    if (eng.phase === "playing" || eng.phase === "clearing") eng.pause();
    else if (eng.phase === "paused") eng.resume();
  };

  const toggleMute = () => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
    persistSettings({ muted: next });
  };
  const toggleShake = () => {
    const eng = engineRef.current;
    const next = !shake;
    setShake(next);
    if (eng) eng.shakeEnabled = next;
    persistSettings({ shake: next });
  };
  const toMenu = () => engineRef.current?.toMenu();
  const phase = hud.phase;

  useEffect(() => {
    setMenuNav({ seq: 0, up: false, down: false, confirm: false, back: false });
  }, [phase]);

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-bg text-fg">
      <header className="flex items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1 md:px-8">
        <span className="font-display text-lg font-semibold tracking-tight">DnB!</span>
      </header>

      <CompactHud hud={hud} />

      <div className="flex min-h-0 flex-1 items-center justify-center gap-4 px-3 pb-2 md:gap-6 md:px-8 md:pb-6">
        <LeftHud hud={hud} onPause={pause} />
        <div ref={wrapRef} className="relative aspect-[1/2] h-full max-h-full w-auto max-w-full">
          <canvas ref={canvasRef} className="well-canvas" tabIndex={0} />
        </div>
        <RightHud hud={hud} />
      </div>

      {(phase === "playing" || phase === "paused" || phase === "clearing") && (
        <TouchPad onPress={press} onRelease={release} onPause={pause} />
      )}

      {phase === "ready" && (
        <MenuOverlay
          highScore={hud.highScore}
          muted={muted}
          nav={menuNav}
          onStart={start}
          onToggleMute={toggleMute}
        />
      )}
      {phase === "paused" && (
        <PauseOverlay
          hud={hud}
          muted={muted}
          shake={shake}
          nav={menuNav}
          onResume={resume}
          onRestart={start}
          onMenu={toMenu}
          onToggleMute={toggleMute}
          onToggleShake={toggleShake}
        />
      )}
      {phase === "over" && (
        <OverOverlay
          hud={hud}
          nav={menuNav}
          onRestart={start}
          onMenu={toMenu}
        />
      )}
      <footer className="px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-xs text-subtle md:px-8">
        v{APP_VERSION}
      </footer>
    </div>
  );
}

function hudEqual(a: HudState, b: HudState): boolean {
  return (
    a.score === b.score &&
    a.highScore === b.highScore &&
    a.level === b.level &&
    a.lines === b.lines &&
    a.phase === b.phase &&
    a.hold === b.hold &&
    a.canHold === b.canHold &&
    a.next.join() === b.next.join()
  );
}
