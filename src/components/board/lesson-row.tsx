import type { ReactNode } from "react";
import { Flaps } from "@/components/board/flaps";
import { StatusWord } from "@/components/board/status";
import { kindLabel, type LessonView } from "@/server/queries/schedule";
import { cn } from "@/lib/utils";

/** Строка табло с парой: время на плитках, название и статус, аудитория. */
export function LessonRow({
  lesson,
  details,
}: {
  lesson: LessonView;
  details?: boolean;
}) {
  const s = lesson.state.kind;
  const dim = s === "past" || s === "cancelled";
  return (
    <div
      role="row"
      id={`lesson-${lesson.id}`}
      className={cn(
        "grid grid-cols-[92px_minmax(0,1fr)_58px] items-center gap-2 border-t border-board-line px-0.5 py-[9px]",
        s === "soon" && "bg-board-soon-row",
      )}
    >
      <div role="cell" className="whitespace-nowrap">
        <Flaps
          value={lesson.start}
          label={`${lesson.start}–${lesson.end}`}
          tone={dim ? "dim" : lesson.move ? "change" : "default"}
        />
      </div>
      <div role="cell" className="min-w-0">
        <div
          className={cn(
            "truncate font-board text-[19px] font-extrabold uppercase leading-[22px] tracking-[0.03em]",
            dim && "text-board-dim",
            s === "cancelled" && "line-through",
          )}
        >
          {lesson.subjectShort}
        </div>
        {details ? (
          <div className="truncate text-[12.5px] leading-4 text-board-muted">
            {kindLabel(lesson.kind)}
            {lesson.teachers[0] ? ` · ${lesson.teachers[0]}` : ""}
          </div>
        ) : null}
        <StatusWord state={lesson.state} />
        {lesson.move && s !== "moved" ? (
          <div>
            <StatusWord state={{ kind: "moved", ...lesson.move }} />
          </div>
        ) : null}
        {details &&
        lesson.change?.reason &&
        (s === "moved" ||
          s === "cancelled" ||
          s === "online" ||
          s === "room") ? (
          <div className="text-[11.5px] text-board-dim">
            {lesson.change.reason}
          </div>
        ) : null}
      </div>
      <div role="cell" className="whitespace-nowrap text-right">
        <Flaps
          value={lesson.roomFlaps}
          label={lesson.roomLabel ?? "онлайн"}
          size="sm"
          tone={dim ? "dim" : "default"}
        />
      </div>
    </div>
  );
}

export function BoardHead() {
  return (
    <div
      role="row"
      className="grid grid-cols-[92px_minmax(0,1fr)_58px] gap-2 px-0.5 py-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-board-head"
    >
      <span role="columnheader">Время</span>
      <span role="columnheader">Пара · статус</span>
      <span role="columnheader" className="text-right">
        Ауд.
      </span>
    </div>
  );
}

/** Дополнительная строка под основной, на все три колонки табло. */
export function BoardDetailRow({ children }: { children: ReactNode }) {
  return (
    <div role="row">
      <div role="cell" aria-colspan={3}>
        {children}
      </div>
    </div>
  );
}
