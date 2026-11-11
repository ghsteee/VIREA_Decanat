import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Navigation, Video } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { BoardHead, LessonRow } from "@/components/board/lesson-row";
import { ConceptNote } from "@/components/concept-note";
import {
  dayRange,
  getAcademicWeek,
  getChangedDays,
  getLessons,
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
  if (lesson.state.kind === "cancelled" || lesson.state.kind === "past")
    return null;
  if (lesson.onlineUrl && !lesson.roomLabel) {
    return (
      <a
        href={lesson.onlineUrl}
        rel="noopener noreferrer"
        target="_blank"
        className="mx-0.5 mb-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-board-row font-semibold text-board-link no-underline"
      >
        <Video size={18} aria-hidden />
        Подключиться
      </a>
    );
  }
  if (!lesson.room || !lesson.roomLabel) return null;
  return (
    <details className="mx-0.5 mb-2 rounded-lg bg-board-row px-3 py-2">
      <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link">
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
  const view = sp.view === "week" ? "week" : "day";
  const monday = weekStart(date);
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const weekFrom = mskDayStart(monday);
  const weekTo = mskDayStart(addDays(monday, 7));

  const [group, week, changedDays, lessons] = await Promise.all([
    db.group.findUnique({
      where: { id: user.groupId },
      select: { code: true },
    }),
    getAcademicWeek(date),
    getChangedDays(user.groupId, weekFrom, weekTo),
    view === "week"
      ? getLessons(user.groupId, weekFrom, weekTo)
      : getLessons(user.groupId, ...dayRange(date)),
  ]);

  const link = (d: string, v = view) =>
    `/schedule?date=${d}${v === "week" ? "&view=week" : ""}`;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-88px)] max-w-[480px] flex-col bg-board text-board-text lg:min-h-dvh">
      <header className="flex flex-col gap-3 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]">
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
                  "flex min-h-[38px] items-center rounded-md px-2.5 font-board text-[15px] font-bold uppercase tracking-[0.06em] no-underline",
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

        <nav
          aria-label="Дни недели"
          className="grid grid-cols-[30px_repeat(6,minmax(0,1fr))_30px] items-center gap-1"
        >
          <Link
            href={link(addDays(monday, -7))}
            aria-label="Предыдущая неделя"
            className="grid h-11 place-items-center text-board-muted"
          >
            <ChevronLeft size={18} aria-hidden />
          </Link>
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
                    aria-label="есть изменения"
                    className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-plate-change"
                  />
                ) : null}
                {d === today ? <span className="sr-only">сегодня</span> : null}
              </Link>
            );
          })}
          <Link
            href={link(addDays(monday, 7))}
            aria-label="Следующая неделя"
            className="grid h-11 place-items-center text-board-muted"
          >
            <ChevronRight size={18} aria-hidden />
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 flex-col px-3 pb-3">
        {view === "day" ? (
          lessons.length ? (
            <div
              role="table"
              aria-label={`Пары, ${weekdayFull(date)} ${dayMonth(date)}`}
            >
              <BoardHead />
              {lessons.map((l) => (
                <div key={l.id}>
                  <LessonRow lesson={l} details />
                  <WhereIs lesson={l} />
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t border-board-line py-6 text-center font-board text-2xl font-extrabold uppercase">
              Пар нет
            </p>
          )
        ) : (
          days.map((d) => {
            const dayLessons = lessons.filter((l) => mskDate(l.startsAt) === d);
            return (
              <section
                key={d}
                aria-label={`${weekdayFull(d)} ${dayMonth(d)}`}
                className="mb-2"
              >
                <h2 className="m-0 border-t border-board-line pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-board-head">
                  {weekdayFull(d)} · {dayMonth(d)}
                  {d === today ? " · сегодня" : ""}
                </h2>
                {dayLessons.length ? (
                  <div role="table">
                    {dayLessons.map((l) => (
                      <LessonRow key={l.id} lesson={l} />
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-[13px] text-board-muted">Пар нет</p>
                )}
              </section>
            );
          })
        )}

        <div className="mt-auto flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-board-line px-0.5 pt-3 text-xs text-board-muted">
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
      </div>
      <div className="bg-bg px-4 py-4">
        <ConceptNote />
      </div>
    </main>
  );
}
