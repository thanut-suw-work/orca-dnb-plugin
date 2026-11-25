import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsDown,
  RotateCcw,
  RotateCw,
  Pause,
} from "lucide-react";
import type { Action } from "@/game/types";
import { cn } from "@/lib/utils";

type Props = {
  onPress: (a: Action) => void;
  onRelease: (a: Action) => void;
  onPause: () => void;
};

function PadButton({
  label,
  children,
  onPress,
  onRelease,
  className,
}: {
  label: string;
  children: ReactNode;
  onPress: () => void;
  onRelease?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex h-14 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border border-border bg-surface text-fg",
        "active:bg-surface-2 select-none touch-none",
        className,
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onPress();
      }}
      onPointerUp={() => onRelease?.()}
      onPointerCancel={() => onRelease?.()}
    >
      {children}
    </button>
  );
}

export function TouchPad({ onPress, onRelease, onPause }: Props) {
  return (
    <div className="flex w-full flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 md:hidden">
      <div className="flex gap-2">
        <PadButton label="Hold" onPress={() => onPress("hold")}>
          <span className="text-xs font-medium uppercase tracking-widest">Hold</span>
        </PadButton>
        <PadButton label="Rotate left" onPress={() => onPress("rotCCW")}>
          <RotateCcw className="size-5" strokeWidth={1.75} />
        </PadButton>
        <PadButton label="Rotate right" onPress={() => onPress("rotCW")}>
          <RotateCw className="size-5" strokeWidth={1.75} />
        </PadButton>
        <PadButton label="Hard drop" onPress={() => onPress("hard")}>
          <ChevronsDown className="size-5" strokeWidth={1.75} />
        </PadButton>
        <PadButton label="Pause" onPress={onPause} className="w-12 flex-none">
          <Pause className="size-4" strokeWidth={1.75} />
        </PadButton>
      </div>
      <div className="flex gap-2">
        <PadButton
          label="Move left"
          onPress={() => onPress("left")}
          onRelease={() => onRelease("left")}
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </PadButton>
        <PadButton
          label="Soft drop"
          onPress={() => onPress("soft")}
          onRelease={() => onRelease("soft")}
        >
          <ArrowDown className="size-5" strokeWidth={1.75} />
        </PadButton>
        <PadButton
          label="Move right"
          onPress={() => onPress("right")}
          onRelease={() => onRelease("right")}
        >
          <ArrowRight className="size-5" strokeWidth={1.75} />
        </PadButton>
      </div>
    </div>
  );
}
