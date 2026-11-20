"use client";

import { type ReactNode, type TouchEvent, useRef } from "react";
import { useRouter } from "next/navigation";

export function ScheduleSwipe({
  previous,
  next,
  children,
}: {
  previous: string;
  next: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const start = useRef<{ id: number; x: number; y: number } | null>(null);

  function begin(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    start.current =
      event.touches.length === 1
        ? { id: touch.identifier, x: touch.clientX, y: touch.clientY }
        : null;
  }

  function finish(event: TouchEvent<HTMLDivElement>) {
    const point = start.current;
    start.current = null;
    if (!point || event.touches.length) return;

    const touch = Array.from(event.changedTouches).find(
      (item) => item.identifier === point.id,
    );
    if (!touch) return;
    const dx = touch.clientX - point.x;
    const dy = touch.clientY - point.y;

    if (Math.abs(dx) >= 65 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
      router.push(dx < 0 ? next : previous);
    }
  }

  return (
    <div
      data-testid="schedule-swipe"
      className="flex flex-1 flex-col"
      style={{ touchAction: "pan-y pinch-zoom" }}
      onTouchStart={begin}
      onTouchEnd={finish}
      onTouchCancel={() => {
        start.current = null;
      }}
    >
      {children}
    </div>
  );
}
