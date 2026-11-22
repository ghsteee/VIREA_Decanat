import Link from "next/link";
import type { LessonView } from "@/server/queries/schedule";
import { calendarMonth } from "@/lib/calendar-month";
import { dayMonth, mskDate, weekdayFull, weekdayShort } from "@/lib/time";
import { cn } from "@/lib/utils";

export function MonthCalendar({
  date,
  lessons,
  changedDays,
}: {
  date: string;
  lessons: LessonView[];
  changedDays: Set<string>;
}) {
  const month = calendarMonth(date);
  const today = mskDate();
  const byDay = new Map<string, LessonView[]>();
  for (const lesson of lessons) {
    const key = mskDate(lesson.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), lesson]);
  }
  return (
    <div>
      <div
        aria-hidden="true"
        className="mb-1 grid grid-cols-7 gap-[3px] text-center text-[11px] font-bold uppercase tracking-wide text-board-muted"
      >
        {month.days.slice(0, 7).map((day) => (
          <span key={day} className="py-2">
            {weekdayShort(day)}
          </span>
        ))}
      </div>
      <nav
        aria-label="Календарь на месяц"
        className="grid grid-cols-7 gap-[3px] md:gap-2"
      >
        {month.days.map((day) => {
          const items = (byDay.get(day) ?? []).filter(
            (lesson) => lesson.state.kind !== "cancelled",
          );
          const changed = changedDays.has(day);
          const current = day === today;
          const inside = day.slice(0, 7) === date.slice(0, 7);
          return (
            <Link
              key={day}
              href={`/schedule?date=${day}`}
              aria-current={current ? "date" : undefined}
              aria-label={`${weekdayFull(day)}, ${dayMonth(day)} ${day.slice(0, 4)}, занятий: ${items.length}${changed ? ", есть изменения" : ""}`}
              className={cn(
                "relative flex min-h-[76px] min-w-0 flex-col gap-1 rounded-lg border px-1 py-2 text-board-text no-underline transition-colors hover:bg-board-soon-row focus-visible:bg-board-soon-row md:min-h-32 md:px-2.5",
                current
                  ? "border-board-link bg-board-row ring-1 ring-inset ring-board-link"
                  : "border-transparent bg-board-row",
                !inside && "bg-transparent text-board-muted",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <b className="font-board text-[22px] font-extrabold leading-6">
                  {Number(day.slice(8))}
                </b>
                {changed ? (
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full bg-plate-change"
                  />
                ) : null}
              </div>
              {items.length ? (
                <>
                  <span className="text-[10px] font-semibold text-board-muted md:hidden">
                    {items.length} зан.
                  </span>
                  <span
                    aria-hidden
                    className="hidden min-w-0 flex-col gap-1 md:flex"
                  >
                    {items.slice(0, 2).map((lesson) => (
                      <span
                        key={lesson.id}
                        className="truncate text-[11px] leading-4"
                      >
                        <b className="font-board text-[14px] tabular-nums">
                          {lesson.start}
                        </b>{" "}
                        {lesson.subjectShort}
                      </span>
                    ))}
                    {items.length > 2 ? (
                      <span className="text-[10px] text-board-muted">
                        Ещё {items.length - 2}
                      </span>
                    ) : null}
                  </span>
                </>
              ) : (
                <span aria-hidden className="text-xs text-board-muted">
                  —
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-board-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-plate-change" />
          Есть изменения
        </span>
        <span>Выбери день, чтобы открыть пары</span>
      </p>
    </div>
  );
}
