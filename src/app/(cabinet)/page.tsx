import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronRight, Navigation } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { BoardHead, LessonRow } from "@/components/board/lesson-row";
import { Flaps } from "@/components/board/flaps";
import { BrandMark } from "@/components/brand-mark";
import { CompactRoute } from "@/components/board/route";
import { ConceptNote } from "@/components/concept-note";
import { DeadlineCheck } from "@/components/deadline-check";
import {
  dayRange,
  getAcademicWeek,
  getLessons,
  kindLabel,
} from "@/server/queries/schedule";
import {
  getTopApplication,
  getUnreadCount,
  getWeekDeadlines,
} from "@/server/queries/today";
import {
  addDays,
  dayMonth,
  daysBetween,
  mskDate,
  mskTime,
  pluralDays,
  weekdayShort,
} from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await requireUser();
  if (user.role === "staff") redirect("/staff");
  if (!user.groupId || !user.studentProfileId) redirect("/profile");

  const now = new Date();
  const today = mskDate(now);
  const tomorrow = addDays(today, 1);
  const [lessons, nextDay, week, deadlines, app, unread] = await Promise.all([
    getLessons(user.groupId, ...dayRange(today), now),
    getLessons(user.groupId, ...dayRange(tomorrow), now),
    getAcademicWeek(today),
    getWeekDeadlines(user.groupId, user.studentProfileId, now),
    getTopApplication(user.studentProfileId),
    getUnreadCount(user.id),
  ]);

  const next = lessons.find(
    (l) =>
      l.state.kind !== "past" && l.state.kind !== "cancelled" && l.roomLabel,
  );
  const tomorrowFirst = nextDay.find((l) => l.state.kind !== "cancelled");
  const appDates = app
    ? Object.fromEntries(
        app.events.map((e) => [e.toStatus, dayMonth(mskDate(e.createdAt))]),
      )
    : {};

  return (
    <main className="mx-auto flex max-w-[480px] flex-col">
      <section
        aria-labelledby="today-title"
        className="bg-board px-3 pb-1 pt-3 text-board-text"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-board text-xl font-extrabold uppercase tracking-[0.03em]">
            <BrandMark size={26} />
            Деканыч
          </div>
          <Link
            href="/feed"
            aria-label={unread ? `Уведомления, ${unread} новых` : "Уведомления"}
            className="relative grid size-11 place-items-center text-board-text"
          >
            <Bell size={22} aria-hidden />
            {unread ? (
              <span className="absolute right-1.5 top-1.5 h-[18px] min-w-[18px] rounded-full bg-plate-change px-1 text-center text-[11px] font-bold leading-[18px] text-plate-ink">
                {unread}
              </span>
            ) : null}
          </Link>
        </div>
        <div className="flex items-end justify-between px-0.5 pb-3 pt-2">
          <div>
            <h1
              id="today-title"
              className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]"
            >
              Расписание
            </h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
              {weekdayShort(today)} {dayMonth(today)}
              {week ? ` · неделя ${week.number}` : ""}
            </p>
          </div>
          <Flaps
            value={mskTime(now)}
            label={`Сейчас ${mskTime(now)}`}
            size="lg"
          />
        </div>

        {lessons.length ? (
          <div role="table" aria-label="Пары сегодня">
            <BoardHead />
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 border-t border-board-line px-0.5 pb-1.5 pt-[18px] text-center">
            <Flaps value="––:––" label="Пар нет" tone="dim" />
            <p className="font-board text-2xl font-extrabold uppercase">
              Пар нет — выходной
            </p>
          </div>
        )}

        {tomorrowFirst ? (
          <Link
            href={`/schedule?date=${tomorrow}`}
            className="flex min-h-11 items-center justify-between border-t border-board-line px-0.5 font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link no-underline"
          >
            Завтра {tomorrowFirst.start} · {tomorrowFirst.subjectShort}
            {tomorrowFirst.state.kind === "online" ? " · онлайн" : ""}
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}
      </section>

      <div className="flex flex-col gap-5 px-4 pb-3 pt-4">
        {next?.roomLabel ? (
          <Link
            href={`/schedule?date=${today}#lesson-${next.id}`}
            className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-action font-semibold text-on-action no-underline"
          >
            <Navigation size={18} aria-hidden />
            Как дойти до {next.roomLabel}
          </Link>
        ) : null}

        <section aria-labelledby="dl-title">
          <h2
            id="dl-title"
            className="mb-1 font-board text-[22px] font-extrabold uppercase leading-[26px] tracking-[0.03em]"
          >
            Дедлайны недели
          </h2>
          {deadlines.length ? (
            <ul className="m-0 list-none border-b border-border p-0">
              {deadlines.map((d) => {
                const days = Math.max(0, daysBetween(today, mskDate(d.dueAt)));
                return (
                  <li
                    key={d.id}
                    className="grid grid-cols-[58px_minmax(0,1fr)_44px] items-center gap-2 border-t border-border py-2"
                  >
                    <div
                      className={`font-board text-[40px] font-extrabold leading-9 ${days > 2 ? "text-text-muted" : ""}`}
                    >
                      {days}
                      <span className="ml-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.04em] text-text-muted">
                        {pluralDays(days).split(" ")[1]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <b
                        className={`text-[15px] ${d.done ? "text-text-muted line-through" : ""}`}
                      >
                        {d.title}
                      </b>
                      <div className="text-[13px] text-text-muted">
                        {d.fromHead ? (
                          <>
                            <span
                              className="mr-1.5 inline-block size-2 rounded-full bg-plate-head"
                              aria-hidden
                            />
                            от старосты ·{" "}
                          </>
                        ) : null}
                        до {weekdayShort(mskDate(d.dueAt))}{" "}
                        {dayMonth(mskDate(d.dueAt))}, {mskTime(d.dueAt)}
                      </div>
                    </div>
                    <DeadlineCheck id={d.id} done={d.done} title={d.title} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-text-muted">
              Дедлайнов на неделе нет. Можно выдохнуть.
            </p>
          )}
        </section>

        {app ? (
          <section aria-labelledby="app-title" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2
                id="app-title"
                className="m-0 font-board text-[22px] font-extrabold uppercase leading-[26px] tracking-[0.03em]"
              >
                {app.type.title}
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                № {String(app.number).padStart(4, "0")}
              </span>
            </div>
            <CompactRoute status={app.status} dates={appDates} />
            {app.status === "ready" ? (
              <p className="m-0 text-[14px] text-text-muted">
                {app.events.at(-1)?.pickupNote ?? "Справка готова"}
              </p>
            ) : null}
            <Link href="/requests" className="text-[14px] font-semibold">
              Все заявки
            </Link>
          </section>
        ) : null}

        {next ? (
          <p className="sr-only">
            Ближайшая пара: {next.subject}, {kindLabel(next.kind)}, {next.start}
          </p>
        ) : null}
        <ConceptNote />
      </div>
    </main>
  );
}
