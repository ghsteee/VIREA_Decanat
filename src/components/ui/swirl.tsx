"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { DitheringShader } from "./dithering-shader";
import { cn } from "@/lib/utils";

export function BrandSwirl({ compact = false }: { compact?: boolean }) {
  const [paused, setPaused] = useState(false);
  const label = paused ? "Включить анимацию" : "Приостановить анимацию";
  const Icon = paused ? Play : Pause;
  return (
    <>
      <DitheringShader
        shape="swirl"
        type="4x4"
        pxSize={4}
        speed={0.9}
        colorBack="var(--board)"
        colorFront="color-mix(in srgb, var(--board) 54%, var(--primary))"
        paused={paused}
      />
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setPaused(!paused)}
        className={cn(
          "absolute z-10 grid size-11 place-items-center rounded-full bg-board text-board-muted hover:bg-board-row focus-visible:bg-board-row motion-reduce:hidden",
          compact ? "left-2 top-2" : "right-2 bottom-2",
        )}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    </>
  );
}
