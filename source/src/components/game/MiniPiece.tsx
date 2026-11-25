import { useEffect, useRef, type ReactNode } from "react";
import type { PieceId } from "@/game/types";
import { drawMini } from "@/game/render";

export function MiniPiece({
  id,
  size = 72,
  faded = false,
  label,
}: {
  id: PieceId | null;
  size?: number;
  faded?: boolean;
  label?: ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMini(ctx, id, size, faded);
  }, [id, size, faded]);

  return (
    <div className="flex flex-col items-center gap-1">
      {label ? (
        <span className="text-center text-xs font-medium uppercase tracking-widest text-subtle">
          {label}
        </span>
      ) : null}
      <canvas
        ref={ref}
        className="block"
        style={{ width: size, height: size }}
        aria-hidden
      />
    </div>
  );
}
