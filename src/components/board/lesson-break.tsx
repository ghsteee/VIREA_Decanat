import { Coffee } from "lucide-react";
import type { LessonBreak as Break } from "@/lib/lesson-breaks";
import { mskTime } from "@/lib/time";
import { BoardDetailRow } from "./lesson-row";

export function LessonBreak({ gap }: { gap?: Break }) {
  if (!gap) return null;
  return (
    <BoardDetailRow>
      <div className="my-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-dashed border-board-line bg-board-row px-3 py-2 text-board-muted">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <Coffee size={15} aria-hidden />
          {gap.minutes >= 60 ? "Окно" : "Перерыв"} · {gap.minutes} мин
        </span>
        <span className="font-board text-[16px] font-bold tabular-nums">
          {mskTime(gap.from)}–{mskTime(gap.to)}
        </span>
      </div>
    </BoardDetailRow>
  );
}
