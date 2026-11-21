"use client";

import { useEffect, useRef } from "react";

export function BrandAurora() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const backdrop = ref.current;
    const panel = backdrop?.parentElement;
    if (!backdrop || !panel) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => {
      backdrop.style.removeProperty("--aurora-x");
      backdrop.style.removeProperty("--aurora-y");
    };
    const move = (event: PointerEvent) => {
      if (motion.matches) return;
      const bounds = panel.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(1, (event.clientX - bounds.left) / bounds.width),
      );
      const y = Math.max(
        0,
        Math.min(1, (event.clientY - bounds.top) / bounds.height),
      );
      backdrop.style.setProperty("--aurora-x", `${(x - 0.5) * 36}px`);
      backdrop.style.setProperty("--aurora-y", `${(y - 0.5) * 20}px`);
    };
    panel.addEventListener("pointermove", move, { passive: true });
    panel.addEventListener("pointerdown", move, { passive: true });
    panel.addEventListener("pointerleave", reset);
    panel.addEventListener("pointercancel", reset);
    motion.addEventListener("change", reset);
    return () => {
      panel.removeEventListener("pointermove", move);
      panel.removeEventListener("pointerdown", move);
      panel.removeEventListener("pointerleave", reset);
      panel.removeEventListener("pointercancel", reset);
      motion.removeEventListener("change", reset);
    };
  }, []);
  return (
    <div ref={ref} aria-hidden="true" className="brand-aurora">
      <span className="brand-aurora-band" />
      <span className="brand-aurora-band" />
      <span className="brand-aurora-band" />
    </div>
  );
}
