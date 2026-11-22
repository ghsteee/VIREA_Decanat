import Link from "next/link";
import { EmptyIllustration } from "@/components/empty-illustration";
import { redirect } from "next/navigation";
import { Bell, ChevronDown, ChevronRight, Navigation } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { BoardHead, LessonRow } from "@/components/board/lesson-row";
import { Flaps } from "@/components/board/flaps";
import { BrandSwirl } from "@/components/ui/swirl";
import { BrandMark } from "@/components/brand-mark";
import { RequestRoute } from "@/components/board/route";
import { DeadlineCheck } from "@/components/deadline-check";
import { AssistantForm } from "./assistant/assistant-form";
import { assistantEnabled } from "@/server/gigachat";
import {
  dayRange,
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
  const [lessons, week, deadlines, app, unread, changes, results] =
    await Promise.all([
      getLessons(user.groupId, ...dayRange(today), now),
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

  const scheduled = lessons.filter(
    (lesson) => lesson.state.kind !== "cancelled",
  );
  const next = scheduled.find((lesson) => lesson.state.kind !== "past");
  const emptyMessage = scheduled.length
    ? "На сегодня пар больше нет"
    : lessons.length
      ? "Сегодня все пары отменены"
      : "Сегодня пар нет";
  const when = (date: Date) => `${dayMonth(mskDate(date))}, ${mskTime(date)}`;
  const changeLabels = {
    moved: "Перенос",
    cancelled: "Отмена",
    room_changed: "Другая аудитория",
    format_changed: "Изменился формат",
    restored: "Пара восстановлена",
  };
  return (
    <main className="cabinet-page today-page">
      <div className="flex min-w-0 flex-col">
        <section
          aria-labelledby="today-title"
          className="min-w-0 bg-board px-3 pb-1 pt-3 text-board-text md:rounded-3xl md:p-6"
        >
          <div className="relative isolate grid min-h-24 place-items-center overflow-hidden rounded-xl md:min-h-32">
            <BrandSwirl compact />
            <div className="pointer-events-none relative flex items-center gap-2 font-board text-3xl font-extrabold uppercase tracking-[0.03em]">
              <BrandMark size={36} />
              Деканыч
            </div>
            <Link
              prefetch={false}
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
          <div className="flex items-end justify-between px-0.5 pb-3 pt-2">
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
            <Flaps
              value={mskTime(now)}
              label={`Сейчас ${mskTime(now)}`}
              size="lg"
            />
          </div>

          {next ? (
            <div role="table" aria-label="Ближайшая пара">
              <BoardHead />
              <LessonRow lesson={next} details />
            </div>
          ) : (
            <div className="empty-state border-t border-board-line">
              <EmptyIllustration scene="today" />
              <p className="m-0 font-board text-2xl font-extrabold uppercase">
                {emptyMessage}
              </p>
            </div>
          )}
          <Link
            href={
              next
                ? `/schedule?date=${today}#lesson-${next.id}`
                : `/schedule?date=${tomorrow}`
            }
            className="flex min-h-11 items-center justify-between border-t border-board-line px-0.5 font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link no-underline"
          >
            {next ? "Всё расписание на сегодня" : "Расписание на завтра"}
            <ChevronRight size={16} aria-hidden />
          </Link>
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

      <div className="today-details min-w-0 px-4 pb-3 pt-4 md:rounded-3xl md:bg-surface">
        {next?.roomLabel ? (
          <Link
            href={`/schedule?date=${today}#lesson-${next.id}`}
            className="today-details-wide flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-action font-semibold text-on-action no-underline"
          >
            <Navigation size={18} aria-hidden />
            Как дойти до {next.roomLabel}
          </Link>
        ) : null}

        {assistantEnabled() && (
          <section
            id="assistant"
            aria-labelledby="today-assistant-title"
            className="today-details-wide min-w-0"
          >
            <details className="group rounded-2xl border border-border bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 md:px-4 [&::-webkit-details-marker]:hidden">
                <span
                  id="today-assistant-title"
                  className="font-board text-2xl font-extrabold uppercase"
                >
                  ИИ-помощник
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-primary motion-safe:transition-transform group-open:rotate-180">
                  <ChevronDown size={19} aria-hidden />
                </span>
              </summary>
              <div className="border-t border-border p-3 md:p-4">
                <AssistantForm />
              </div>
            </details>
          </section>
        )}

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
            <RequestRoute status={app.status} events={app.events} />
            <Link
              href="/requests"
              className="flex min-h-11 items-center justify-center rounded-[10px] bg-action px-4 py-2 font-semibold text-on-action no-underline hover:brightness-95 active:brightness-90"
            >
              Все заявки
            </Link>
          </section>
        ) : null}

        {next ? (
          <p className="sr-only">
            Ближайшая пара: {next.subject}, {kindLabel(next.kind)}, {next.start}
          </p>
        ) : null}
      </div>
    </main>
  );
}
