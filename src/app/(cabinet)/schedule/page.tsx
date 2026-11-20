import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Video,
} from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import {
  BoardDetailRow,
  BoardHead,
  LessonRow,
} from "@/components/board/lesson-row";
import { ScheduleSwipe } from "@/components/board/schedule-swipe";
import {
  dayRange,
  getAcademicWeek,
  getChangedDays,
  getLessons,
  getMovedOut,
  type LessonView,
} from "@/server/queries/schedule";
import { db } from "@/server/db";
import {
  addDays,
  dayMonth,
  mskDate,
  mskDayStart,
  weekStart,
  weekdayFull,
  weekdayShort,
} from "@/lib/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Search = Promise<{ date?: string; view?: string }>;

function validDate(s?: string) {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
    ? s
    : null;
}

function WhereIs({ lesson }: { lesson: LessonView }) {
  if (lesson.onlineUrl && !lesson.roomLabel) {
    return (
      <a
        href={lesson.onlineUrl}
        rel="noopener noreferrer"
        target="_blank"
        className="ml-0.5 flex h-11 items-center justify-center gap-2 rounded-xl bg-board-row font-semibold text-board-link no-underline"
      >
        <Video size={18} aria-hidden />
        Подключиться
      </a>
    );
  }
  if (!lesson.room || !lesson.roomLabel) return null;
  return (
    <details className="ml-0.5 rounded-lg bg-board-row px-3 py-2">
      <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link">
        <Navigation size={14} aria-hidden />
        Где {lesson.roomLabel}
      </summary>
      <p className="m-0 text-[13.5px] leading-[19px] text-board-text">
        {lesson.room.campus}
        {lesson.room.floor ? `, ${lesson.room.floor}-й этаж` : ""}.{" "}
        {lesson.room.address}.
      </p>
    </details>
  );
}

function MovedOut({
  items,
}: {
  items: Awaited<ReturnType<typeof getMovedOut>>;
}) {
  if (!items.length) return null;
  return (
    <section
      aria-label="Перенесённые пары"
      className="flex flex-col gap-2 py-2"
    >
      {items.map((move) => (
        <Link
          key={move.key}
          href={`/schedule?date=${move.toDate}#lesson-${move.lessonId}`}
          className="flex min-h-11 flex-col justify-center rounded-lg bg-board-row px-3 py-2 text-board-link"
        >
          <span className="font-semibold">{move.subject}</span>
          <span className="text-sm">
            Перенос · {move.from} → {move.to}
          </span>
        </Link>
      ))}
    </section>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const user = await requireUser();
  if (user.role === "staff") redirect("/staff/schedule");
  if (!user.groupId) redirect("/profile");

  const sp = await searchParams;
  const today = mskDate();
  const date = validDate(sp.date) ?? today;
  const dateTitle = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(mskDayStart(date));
  const view = sp.view === "week" ? "week" : "day";
  const monday = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekFrom = mskDayStart(monday);
  const weekTo = mskDayStart(addDays(monday, 7));

  const range =
    view === "week" ? ([weekFrom, weekTo] as const) : dayRange(date);
  const [group, week, changedDays, lessons, movedOut] = await Promise.all([
    db.group.findUnique({
      where: { id: user.groupId },
      select: { code: true },
    }),
    getAcademicWeek(date),
    getChangedDays(user.groupId, weekFrom, weekTo),
    getLessons(user.groupId, ...range),
    getMovedOut(user.groupId, ...range),
  ]);

  const link = (d: string, v = view) =>
    `/schedule?date=${d}${v === "week" ? "&view=week" : ""}`;

  return (
    <main className="cabinet-page schedule-page">
      <header className="schedule-picker">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-none tracking-[0.03em] lg:text-[46px]">
              Расписание
            </h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
              {week
                ? `Неделя ${week.number} · ${week.odd ? "нечётная" : "чётная"} · `
                : ""}
              {group?.code}
            </p>
          </div>
          <div
            role="group"
            aria-label="Вид"
            className="inline-flex rounded-lg bg-board-row p-[3px]"
          >
            {(["day", "week"] as const).map((v) => (
              <Link
                key={v}
                href={link(date, v)}
                aria-current={view === v ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-2.5 font-board text-[15px] font-bold uppercase tracking-[0.06em] no-underline",
                  view === v
                    ? "bg-nav text-nav-active-text"
                    : "text-board-muted",
                )}
                style={
                  view === v
                    ? { background: "var(--board-text)", color: "var(--board)" }
                    : undefined
                }
              >
                {v === "day" ? "День" : "Неделя"}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-board-row px-1">
          <Link
            href={link(addDays(monday, -7))}
            aria-label="Предыдущая неделя"
            className="grid size-11 place-items-center text-board-muted"
          >
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <Link
            href={link(today, "day")}
            className="flex min-h-11 items-center px-3 font-semibold text-board-link no-underline"
          >
            Сегодня
          </Link>
          <Link
            href={link(addDays(monday, 7))}
            aria-label="Следующая неделя"
            className="grid size-11 place-items-center text-board-muted"
          >
            <ChevronRight size={18} aria-hidden />
          </Link>
        </div>
        <nav
          aria-label="Дни недели"
          className="grid grid-cols-7 items-center gap-[3px] md:gap-1"
        >
          {days.map((d) => {
            const selected = view === "day" && d === date;
            return (
              <Link
                key={d}
                href={link(d, "day")}
                aria-current={selected ? "date" : undefined}
                className={cn(
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-px rounded-md no-underline",
                  selected ? "" : "bg-board-row text-board-muted",
                )}
                style={
                  selected
                    ? { background: "var(--board-text)", color: "var(--board)" }
                    : undefined
                }
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
                  {weekdayShort(d)}
                </span>
                <b
                  className={cn(
                    "font-board text-[22px] font-extrabold leading-[22px]",
                    !selected && "text-board-text",
                  )}
                >
                  {d.slice(8)}
                </b>
                {changedDays.has(d) ? (
                  <i
                    aria-hidden
                    className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-plate-change"
                  />
                ) : null}
                <span className="sr-only">
                  {weekdayFull(d)}, {dayMonth(d)}
                  {d === today ? ", сегодня" : ""}
                  {changedDays.has(d) ? ", есть изменения" : ""}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      <section className="schedule-results" aria-labelledby="schedule-period">
        <h2
          id="schedule-period"
          className="mb-3 font-board text-[28px] font-bold uppercase leading-tight"
        >
          {view === "day"
            ? dateTitle
            : `Неделя · ${dayMonth(monday)} — ${dayMonth(days[6])}`}
        </h2>
        {view === "day" ? (
          <ScheduleSwipe
            previous={link(addDays(date, -1), "day")}
            next={link(addDays(date, 1), "day")}
          >
            <MovedOut items={movedOut} />
            {lessons.length ? (
              <div
                role="table"
                aria-label={`Пары, ${weekdayFull(date)} ${dayMonth(date)}`}
              >
                <BoardHead wide />
                {lessons.map((l) => (
                  <div key={l.id} role="rowgroup">
                    <LessonRow lesson={l} details wide />
                    {l.state.kind !== "cancelled" && l.state.kind !== "past" ? (
                      <BoardDetailRow>
                        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5">
                          <div>
                            <WhereIs lesson={l} />
                          </div>
                          <a
                            href={`/schedule/calendar/${l.id}`}
                            download
                            aria-label={`В календарь: ${l.subject}`}
                            title="Скачать пару в календарь"
                            className="mr-0.5 flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-board-row px-3 text-sm font-semibold text-board-link no-underline"
                          >
                            <CalendarPlus size={16} aria-hidden />В календарь
                          </a>
                        </div>
                      </BoardDetailRow>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-board-line py-6 text-center font-board text-2xl font-extrabold uppercase">
                Пар нет
              </p>
            )}
            {lessons.some(
              (l) => l.state.kind !== "past" && l.state.kind !== "cancelled",
            ) ? (
              <p className="mb-2 text-xs text-board-muted">
                В календаре останется время на момент скачивания.
              </p>
            ) : null}
          </ScheduleSwipe>
        ) : (
          <div className="schedule-week">
            {days.map((d) => {
              const dayLessons = lessons.filter(
                (l) => mskDate(l.startsAt) === d,
              );
              return (
                <section
                  key={d}
                  aria-label={`${weekdayFull(d)} ${dayMonth(d)}`}
                  className="rounded-xl bg-board-row p-3"
                >
                  <h2 className="m-0 pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-board-head">
                    {weekdayFull(d)} · {dayMonth(d)}
                    {d === today ? " · сегодня" : ""}
                  </h2>
                  <MovedOut
                    items={movedOut.filter((move) => move.date === d)}
                  />
                  {dayLessons.length ? (
                    <div
                      role="table"
                      aria-label={`Пары, ${weekdayFull(d)} ${dayMonth(d)}`}
                    >
                      {dayLessons.map((l) => (
                        <LessonRow key={l.id} lesson={l} />
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-[13px] text-board-muted">Пар нет</p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-board-line px-0.5 pt-3 text-xs text-board-muted">
          <span>
            <b className="font-board uppercase tracking-[0.06em] text-board-soon">
              скоро
            </b>{" "}
            — меньше часа
          </span>
          <span>
            <b className="font-board uppercase tracking-[0.06em] text-board-change">
              перенос
            </b>{" "}
            — новое время
          </span>
          <span>
            <b className="rounded-[3px] bg-plate-danger px-1 font-board uppercase tracking-[0.06em] text-white">
              отмена
            </b>{" "}
            — пары не будет
          </span>
        </div>
      </section>
    </main>
  );
}
