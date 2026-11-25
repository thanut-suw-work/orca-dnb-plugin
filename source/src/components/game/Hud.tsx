import { Pause } from "lucide-react";
import { MiniPiece } from "./MiniPiece";
import type { HudState } from "@/game/types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-widest text-subtle">{label}</span>
      <span className="font-display text-xl font-semibold tabular-nums tracking-tight text-fg sm:text-2xl">
        {value}
      </span>
    </div>
  );
}

export function CompactHud({ hud }: { hud: HudState; padLabel?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 md:hidden">
      <MiniPiece id={hud.hold} size={48} faded={!hud.canHold} label="Hold" />
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <span className="font-display text-2xl font-semibold tabular-nums tracking-tight">
          {hud.score.toLocaleString("en-US")}
        </span>
        <span className="text-xs uppercase tracking-widest text-subtle">
          Lvl {hud.level} · {hud.lines} lines
        </span>
      </div>
      <MiniPiece id={hud.next[0] ?? null} size={48} label="Next" />
    </div>
  );
}

export function LeftHud({
  hud,
  onPause,
}: {
  hud: HudState;
  padLabel?: string | null;
  onPause: () => void;
}) {
  return (
    <aside className="hidden w-28 shrink-0 flex-col gap-6 md:flex">
      <div className="rounded-lg border border-border bg-surface p-3">
        <MiniPiece id={hud.hold} size={88} faded={!hud.canHold} label="Hold" />
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface px-3 py-4">
        <Stat label="Score" value={hud.score.toLocaleString("en-US")} />
        <Stat label="Level" value={hud.level} />
        <Stat label="Lines" value={hud.lines} />
        <Stat label="Best" value={hud.highScore.toLocaleString("en-US")} />
      </div>
      {hud.phase === "playing" || hud.phase === "clearing" ? (
        <button
          type="button"
          onClick={onPause}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-sm border border-border text-xs font-medium uppercase tracking-widest text-muted hover:bg-surface-2 hover:text-fg"
        >
          <Pause className="size-3.5" strokeWidth={1.75} />
          Pause
        </button>
      ) : null}
    </aside>
  );
}

export function RightHud({ hud }: { hud: HudState }) {
  return (
    <aside className="hidden w-28 shrink-0 flex-col gap-3 md:flex">
      <div className="rounded-lg border border-border bg-surface px-3 py-3">
        <span className="mb-2 block text-center text-xs font-medium uppercase tracking-widest text-subtle">
          Next
        </span>
        <div className="flex flex-col items-center gap-2">
          {hud.next.slice(0, 5).map((id, i) => (
            <MiniPiece key={`${id}-${i}`} id={id} size={i === 0 ? 80 : 56} />
          ))}
        </div>
      </div>
    </aside>
  );
}
