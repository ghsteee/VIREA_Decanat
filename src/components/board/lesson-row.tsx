import type { ReactNode } from "react";
import { Flaps } from "@/components/board/flaps";
import { StatusWord } from "@/components/board/status";
import { kindLabel, type LessonView } from "@/server/queries/schedule";
import { cn } from "@/lib/utils";

const wideColumns = "md:grid-cols-[126px_minmax(0,1fr)_82px]";

/** Строка табло: единый стиль времени начала и конца, пара и аудитория. */
export function LessonRow({
  lesson,
  details,
  wide,
}: {
  lesson: LessonView;
  details?: boolean;
  wide?: boolean;
}) {
  const s = lesson.state.kind;
  const dim = s === "past" || s === "cancelled";
  return (
    <div
      role="row"
      id={`lesson-${lesson.id}`}
      className={cn(
        "lesson-row grid grid-cols-[92px_minmax(0,1fr)_76px] items-center gap-2 border-t border-board-line px-0.5 py-[9px]",
        wide && wideColumns,
        s === "soon" && "bg-board-soon-row",
      )}
    >
      <div
        role="cell"
        className={cn(
          "lesson-time flex flex-col items-start whitespace-nowrap font-board text-[24px] font-bold leading-6 tabular-nums",
          wide && "md:text-[26px] md:leading-7",
          dim
            ? "text-board-dim"
            : lesson.move
              ? "text-board-change"
              : "text-board-text",
        )}
      >
        <time dateTime={lesson.startsAt.toISOString()}>{lesson.start}</time>
        <time
          dateTime={lesson.endsAt.toISOString()}
          className={dim ? undefined : "text-board-muted"}
        >
          <span className="sr-only">до </span>
          {lesson.end}
        </time>
      </div>
      <div role="cell" className="min-w-0">
        <div
          className={cn(
            "text-[15px] font-semibold leading-5",
            "[overflow-wrap:anywhere]",
            wide && "md:text-base md:leading-6",
            dim && "text-board-dim",
            s === "cancelled" && "line-through",
          )}
        >
          {lesson.subject}
        </div>
        {details ? (
          <div className="text-[12.5px] leading-4 text-board-muted [overflow-wrap:anywhere]">
            {kindLabel(lesson.kind)}
            {lesson.teachers.length
              ? ` · ${lesson.teachers.map((name) => name.replace(/ (?=\S\.)/g, "\u00a0")).join(", ")}`
              : ""}
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
          label={
            lesson.roomLabel ??
            (lesson.roomFlaps === "ОНЛ" ? "онлайн" : "аудитория уточняется")
          }
          size="sm"
          tone={dim ? "dim" : "default"}
        />
      </div>
    </div>
  );
}

export function BoardHead({ wide }: { wide?: boolean } = {}) {
  return (
    <div
      role="row"
      className={cn(
        "lesson-head grid grid-cols-[92px_minmax(0,1fr)_76px] gap-2 px-0.5 py-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-board-head",
        wide && wideColumns,
      )}
    >
      <span role="columnheader">
        Время<span className="hidden max-[399px]:block">Аудитория</span>
      </span>
      <span role="columnheader">Пара · статус</span>
      <span role="columnheader" className="text-right">
        Аудитория
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
