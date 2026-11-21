import Link from "next/link";
import { EmptyIllustration } from "@/components/empty-illustration";
import { redirect } from "next/navigation";
import { Bell, ChevronRight, Navigation } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { BoardHead, LessonRow } from "@/components/board/lesson-row";
import { Flaps } from "@/components/board/flaps";
import { BrandAurora } from "@/components/brand-aurora";
import { BrandMark } from "@/components/brand-mark";
import { ConceptNote } from "@/components/concept-note";
import { CompactRoute } from "@/components/board/route";
import { DeadlineCheck } from "@/components/deadline-check";
import {
  getAcademicWeek,
  getLessons,
  kindLabel,
} from "@/server/queries/schedule";
import {
  getTopApplication,
  getTodayChanges,
  getNewResults,
  getUnreadCount,
  getWeekDeadlines,
} from "@/server/queries/today";
import {
  addDays,
  dayMonth,
  daysBetween,
  mskDate,
  mskDayStart,
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
  const [upcoming, week, deadlines, app, unread, changes, results] =
    await Promise.all([
      getLessons(
        user.groupId,
        mskDayStart(today),
        mskDayStart(addDays(today, 8)),
        now,
      ),
      getAcademicWeek(today),
      getWeekDeadlines(user.groupId, user.studentProfileId, now),
      getTopApplication(user.studentProfileId),
      getUnreadCount(user.id),
      getTodayChanges(
        user.groupId,
        mskDayStart(today),
        mskDayStart(addDays(today, 2)),
      ),
      getNewResults(user.studentProfileId, now),
    ]);

  const lessons = upcoming.filter(
    (lesson) => mskDate(lesson.startsAt) === today,
  );
  const closest = upcoming.find(
    (l) => l.state.kind !== "past" && l.state.kind !== "cancelled",
  );
  const closestDate = closest ? mskDate(closest.startsAt) : today;
  const next = closestDate === today ? closest : undefined;
  const closestDay =
    closestDate === today
      ? "Сегодня"
      : closestDate === tomorrow
        ? "Завтра"
        : `${weekdayShort(closestDate)}, ${dayMonth(closestDate)}`;
  const when = (date: Date) => `${dayMonth(mskDate(date))}, ${mskTime(date)}`;
  const changeLabels = {
    moved: "Перенос",
    cancelled: "Отмена",
    room_changed: "Другая аудитория",
    format_changed: "Изменился формат",
    restored: "Пара восстановлена",
  };
  const appDates = app
    ? Object.fromEntries(
        app.events.map((e) => [e.toStatus, dayMonth(mskDate(e.createdAt))]),
      )
    : {};

  return (
    <main className="cabinet-page cabinet-columns flex flex-col lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)] lg:gap-6">
      <div className="flex min-w-0 flex-col [&>section:last-child]:grow">
        <section
          aria-labelledby="today-title"
          className="min-w-0 bg-board px-3 pb-1 pt-3 text-board-text md:rounded-3xl md:p-6"
        >
          <div className="relative isolate grid min-h-16 place-items-center overflow-hidden rounded-xl md:min-h-20">
            <BrandAurora />
            <div className="pointer-events-none relative flex items-center gap-2 font-board text-2xl font-extrabold uppercase tracking-[0.03em]">
              <BrandMark size={28} />
              Деканыч
            </div>
            <Link
              href="/feed"
              aria-label={
                unread ? `Уведомления, ${unread} новых` : "Уведомления"
              }
              className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-board text-board-text"
            >
              <Bell size={22} aria-hidden />
              {unread ? (
                <span className="absolute right-1.5 top-1.5 h-[18px] min-w-[18px] rounded-full bg-plate-change px-1 text-center text-[11px] font-bold leading-[18px] text-plate-ink">
                  {unread}
                </span>
              ) : null}
            </Link>
          </div>
          <div className="flex items-end justify-between gap-3 px-0.5 pb-3 pt-3">
            <div>
              <h1
                id="today-title"
                className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em] lg:text-[46px] lg:leading-[44px]"
              >
                Сегодня
              </h1>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
                {weekdayShort(today)} {dayMonth(today)}
                {week ? ` · неделя ${week.number}` : ""}
              </p>
            </div>
            <div className="shrink-0 pb-0.5 text-right">
              <ConceptNote className="text-[11px] font-medium text-board-muted" />
              <p className="font-board text-xl font-bold text-board-muted">
                Сейчас {mskTime(now)}
              </p>
            </div>
          </div>

          {closest ? (
            <div>
              <p
                className="border-t border-board-line px-0.5 py-2 text-xs font-bold text-board-link"
                data-next-lesson-day
              >
                {closestDay} ·{" "}
                {closest.state.kind === "now"
                  ? "идёт сейчас"
                  : "ближайшая пара"}
              </p>
              <div role="table" aria-label="Ближайшая пара">
                <BoardHead />
                <LessonRow lesson={closest} details />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 border-t border-board-line px-0.5 pb-1.5 pt-[18px] text-center">
              <Flaps value="––:––" label="Пар нет" tone="dim" />
              {lessons.length > 0 && (
                <p className="font-board text-2xl font-extrabold uppercase">
                  Пар больше нет
                </p>
              )}
            </div>
          )}

          {closest ? (
            <Link
              href={`/schedule?date=${closestDate}#lesson-${closest.id}`}
              className="flex min-h-11 items-center justify-between border-t border-board-line px-0.5 font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link no-underline"
            >
              {next
                ? "Всё расписание на сегодня"
                : `Расписание · ${closestDay.toLowerCase()}`}
              <ChevronRight size={16} aria-hidden />
            </Link>
          ) : null}
          {lessons.length === 0 && (
            <div className="empty-state border-t border-board-line">
              <EmptyIllustration scene="today" />
              <p className="m-0 font-board text-2xl font-extrabold uppercase">
                Сегодня пар нет
              </p>
            </div>
          )}
        </section>

        {changes.length > 0 && (
          <section
            aria-labelledby="changes-title"
            className="px-4 pt-4 md:mt-5 md:rounded-3xl md:bg-surface md:p-6"
          >
            <h2
              id="changes-title"
              className="mb-1 font-board text-[22px] font-extrabold uppercase"
            >
              Изменения сегодня и завтра
            </h2>
            <ul className="m-0 list-none p-0">
              {changes.map((change) => (
                <li
                  key={change.id}
                  className="border-t border-border py-2 text-sm"
                >
                  <Link
                    href={`/schedule?date=${mskDate(change.newStartsAt)}#lesson-${change.lessonId}`}
                    className="font-semibold"
                  >
                    {changeLabels[change.kind]} · {change.lesson.subject.name}
                    {change.authorRole === "group_head" ? " · от старосты" : ""}
                  </Link>
                  <p className="m-0 text-text-muted">
                    {change.kind === "moved"
                      ? `${when(change.previousStartsAt)} → ${when(change.newStartsAt)}`
                      : when(change.newStartsAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="min-w-0 flex flex-col gap-5 px-4 pb-3 pt-4 md:mt-5 md:grid md:grid-cols-2 md:gap-x-6 md:rounded-3xl md:bg-surface md:p-6 lg:mt-0 lg:flex">
        {next?.roomLabel ? (
          <Link
            href={`/schedule?date=${today}#lesson-${next.id}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] md:col-span-2 bg-action font-semibold text-on-action no-underline"
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
            <div className="empty-state">
              <EmptyIllustration scene="deadlines" />
              <p className="text-[14px] text-text-muted">
                Дедлайнов на неделе нет. Можно выдохнуть.
              </p>
            </div>
          )}
        </section>

        {results.length > 0 && (
          <section aria-labelledby="results-title">
            <h2
              id="results-title"
              className="mb-1 font-board text-[22px] font-extrabold uppercase"
            >
              Новые оценки
            </h2>
            <ul className="m-0 list-none p-0 text-sm">
              {results.map((result) => (
                <li
                  key={result.id}
                  className="flex justify-between gap-2 border-t border-border py-2"
                >
                  <span>
                    {result.assessment.subject.name} · {result.assessment.title}
                  </span>
                  <b className="shrink-0">
                    {result.scale === "pass_fail"
                      ? result.passed
                        ? "Зачёт"
                        : "Незачёт"
                      : result.value}
                  </b>
                </li>
              ))}
            </ul>
            <Link
              href="/study"
              className="inline-flex min-h-11 items-center text-sm font-semibold"
            >
              Все оценки
            </Link>
          </section>
        )}

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
            <Link
              href="/requests"
              className="flex min-h-11 items-center justify-center rounded-[10px] bg-action px-4 py-2 font-semibold text-on-action no-underline hover:brightness-95 active:brightness-90"
            >
              Все заявки
            </Link>
          </section>
        ) : (
          <section className="flex flex-col gap-3" aria-labelledby="app-title">
            <h2
              id="app-title"
              className="font-board text-[22px] font-extrabold uppercase"
            >
              Заявки и справки
            </h2>
            <p className="text-sm text-text-muted">
              Закажи справку — данные из профиля уже подставлены.
            </p>
            <Link
              href="/requests"
              className="flex min-h-11 items-center justify-center rounded-xl bg-action px-4 py-2 font-semibold text-on-action no-underline"
            >
              Заказать справку
            </Link>
          </section>
        )}

        {next ? (
          <p className="sr-only">
            Ближайшая пара: {next.subject}, {kindLabel(next.kind)}, {next.start}
          </p>
        ) : null}
      </div>
    </main>
  );
}
