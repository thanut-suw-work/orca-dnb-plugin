import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { HudState } from "@/game/types";
import { cn } from "@/lib/utils";
import { InstallButton } from "./InstallButton";
import { APP_VERSION } from "@/game/version";

const VIBE_QUOTES = [
  "For vibecoders who sent the prompt and needed a place to sit.",
  "The agent is working. You can drop a few.",
  "Don't watch the spinner. Watch the well.",
  "Made for the gap between prompt and pull request.",
  "Relax. Your agent has the wheel.",
  "Waiting on the agent is a feature.",
  "Ship the prompt. Clear a line. Check back later.",
  "A quiet stack for while the tokens cook.",
];

export type MenuTick = {
  seq: number;
  up: boolean;
  down: boolean;
  confirm: boolean;
  back: boolean;
};

function VibeQuote() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % VIBE_QUOTES.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="mt-3 max-w-72 text-xs text-subtle italic text-pretty">
      {VIBE_QUOTES[index]}
    </p>
  );
}

function formatScore(n: number): string {
  return n.toLocaleString("en-US");
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-bg/80 px-6",
        className,
      )}
    >
      <div className="stagger-in flex w-full max-w-sm flex-col items-center overflow-y-auto rounded-xl border border-border bg-surface px-7 py-6 text-center shadow-2xl max-h-[calc(100dvh-2rem)]">
        {children}
        <p className="mt-4 text-xs text-subtle">v{APP_VERSION}</p>
      </div>
    </div>
  );
}

type MenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

function MenuSelect({
  items,
  nav,
  onBack,
}: {
  items: MenuItem[];
  nav: MenuTick;
  onBack?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const itemsRef = useRef(items);
  const onBackRef = useRef(onBack);
  const seenSeq = useRef(nav.seq);
  itemsRef.current = items;
  indexRef.current = index;
  onBackRef.current = onBack;

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  useEffect(() => {
    if (nav.seq === seenSeq.current) return;
    seenSeq.current = nav.seq;
    const list = itemsRef.current;
    if (!list.length) return;
    let next = indexRef.current;
    if (nav.up) next = (next - 1 + list.length) % list.length;
    if (nav.down) next = (next + 1) % list.length;
    if (next !== indexRef.current) setIndex(next);
    if (nav.confirm) list[next]?.onSelect();
    if (nav.back) onBackRef.current?.();
  }, [nav.seq, nav.up, nav.down, nav.confirm, nav.back]);

  return (
    <div className="mt-5 flex w-full flex-col gap-2">
      {items.map((item, i) => (
        <Button
          key={item.id}
          className="w-full"
          variant={i === index ? "solid" : "ghost"}
          onClick={item.onSelect}
          onMouseEnter={() => setIndex(i)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}

export function MenuOverlay({
  highScore,
  muted,
  nav,
  onStart,
  onToggleMute,
}: {
  highScore: number;
  muted: boolean;
  nav: MenuTick;
  onStart: () => void;
  onToggleMute: () => void;
}) {
  const items: MenuItem[] = [
    { id: "play", label: "Play", onSelect: onStart },
    {
      id: "mute",
      label: muted ? "Sound off" : "Sound on",
      onSelect: onToggleMute,
    },
  ];

  return (
    <Panel>
      <p className="text-xs font-medium uppercase tracking-widest text-subtle">Menu</p>
      <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-fg">DnB!</h1>
      <p className="mt-1 font-display text-lg font-medium tracking-tight text-fg">Drop and Boom!</p>
      <p className="mt-2 max-w-64 text-sm text-muted text-pretty">
        Drop. Clear. Boom! A falling-block puzzle for while the agent works.
      </p>
      {highScore > 0 ? (
        <p className="mt-4 font-medium tabular-nums text-sm text-fg">
          Best <span className="text-muted">{formatScore(highScore)}</span>
        </p>
      ) : null}
      <MenuSelect items={items} nav={nav} />
      <InstallButton className="mt-2 w-full" />
      <dl className="mt-5 hidden w-full grid-cols-2 gap-x-4 gap-y-1.5 text-left text-xs text-subtle sm:grid">
        <dt>Move</dt>
        <dd className="text-muted">← →</dd>
        <dt>Rotate R / L</dt>
        <dd className="text-muted">X Z</dd>
        <dt>Soft / hard</dt>
        <dd className="text-muted">↓ Space</dd>
        <dt>Hold</dt>
        <dd className="text-muted">C</dd>
        <dt>Pause</dt>
        <dd className="text-muted">Esc</dd>
        <dt>180</dt>
        <dd className="text-muted">Q</dd>
      </dl>
      <VibeQuote />
    </Panel>
  );
}

export function PauseOverlay({
  hud,
  muted,
  shake,
  nav,
  onResume,
  onRestart,
  onMenu,
  onToggleMute,
  onToggleShake,
}: {
  hud: HudState;
  muted: boolean;
  shake: boolean;
  nav: MenuTick;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
  onToggleShake: () => void;
}) {
  const items: MenuItem[] = [
    { id: "resume", label: "Resume", onSelect: onResume },
    { id: "restart", label: "Restart", onSelect: onRestart },
    { id: "menu", label: "Main menu", onSelect: onMenu },
    { id: "mute", label: muted ? "Unmute" : "Mute", onSelect: onToggleMute },
    { id: "shake", label: shake ? "Shake on" : "Shake off", onSelect: onToggleShake },
  ];

  return (
    <Panel>
      <h2 className="font-display text-3xl font-semibold tracking-tight">Paused</h2>
      <p className="mt-2 tabular-nums text-sm text-muted">
        {formatScore(hud.score)} · Lvl {hud.level}
      </p>
      <MenuSelect items={items} nav={nav} onBack={onResume} />
    </Panel>
  );
}

export function OverOverlay({
  hud,
  nav,
  onRestart,
  onMenu,
}: {
  hud: HudState;
  nav: MenuTick;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const isBest = hud.score > 0 && hud.score >= hud.highScore;
  const items: MenuItem[] = [
    { id: "again", label: "Play again", onSelect: onRestart },
    { id: "menu", label: "Main menu", onSelect: onMenu },
  ];
  return (
    <Panel>
      <p className="text-xs font-medium uppercase tracking-widest text-subtle">Stack overflow</p>
      <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Game over</h2>
      <p className="mt-5 font-display text-4xl font-semibold tabular-nums tracking-tight">
        {formatScore(hud.score)}
      </p>
      <p className="mt-2 text-sm text-muted">
        {hud.lines} lines · level {hud.level}
        {isBest ? " · new best" : ` · best ${formatScore(hud.highScore)}`}
      </p>
      <MenuSelect items={items} nav={nav} onBack={onMenu} />
      <InstallButton className="mt-2 w-full" />
    </Panel>
  );
}
