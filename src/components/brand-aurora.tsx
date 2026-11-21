"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandAurora({ compact = false }: { compact?: boolean }) {
  const [paused, setPaused] = useState(false);
  const label = paused ? "Включить анимацию" : "Приостановить анимацию";
  const Icon = paused ? Play : Pause;
  return (
    <>
      <div
        aria-hidden="true"
        className="brand-aurora"
        data-paused={paused}
      >
        <span className="brand-aurora-band" />
        <span className="brand-aurora-band" />
        <span className="brand-aurora-band" />
      </div>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setPaused(!paused)}
        className={cn(
          "absolute z-10 grid size-11 place-items-center rounded-full bg-board/80 text-board-muted hover:bg-board-row focus-visible:bg-board-row motion-reduce:hidden",
          compact ? "left-2 top-2" : "right-2 bottom-2",
        )}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    </>
  );
}
