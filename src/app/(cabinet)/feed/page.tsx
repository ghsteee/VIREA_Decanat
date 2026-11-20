import Link from "next/link";
import { EmptyIllustration } from "@/components/empty-illustration";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Flaps } from "@/components/board/flaps";
import { Plate } from "@/components/board/plate";
import { mskDate, mskTime, weekdayShort } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { NotificationKind } from "@prisma/client";

export const dynamic = "force-dynamic";

const FILTERS = {
  all: { label: "Все", kinds: null },
  changes: { label: "Изменения", kinds: ["lesson_change"] },
  deadlines: { label: "Дедлайны", kinds: ["deadline", "deadline_reminder"] },
  requests: { label: "Заявки", kinds: ["application_status"] },
  announcements: { label: "Объявления", kinds: ["announcement"] },
} as const satisfies Record<
  string,
  { label: string; kinds: readonly NotificationKind[] | null }
>;
type FilterKey = keyof typeof FILTERS;

type Row = Awaited<ReturnType<typeof load>>[number];

async function load(userId: string, kinds: readonly NotificationKind[] | null) {
  return db.notificationRecipient.findMany({
    where: {
      userId,
      ...(kinds ? { notification: { kind: { in: [...kinds] } } } : {}),
    },
    orderBy: { notification: { publishedAt: "desc" } },
    take: 50,
    select: {
      id: true,
      readAt: true,
      notification: {
        select: {
          kind: true,
          title: true,
          body: true,
          publishedAt: true,
          lessonChange: {
            select: { kind: true, newStartsAt: true, authorRole: true },
          },
          deadline: { select: { authorRole: true } },
          announcement: { select: { authorRole: true } },
        },
      },
    },
  });
}

function plate(n: Row["notification"]) {
  switch (n.kind) {
    case "lesson_change": {
      const k = n.lessonChange?.kind;
      const source =
        n.lessonChange?.authorRole === "group_head" ? " · от старосты" : "";

      if (k === "cancelled") return <Plate tone="danger">отмена{source}</Plate>;
      if (k === "format_changed")
        return <Plate tone="info">дистант{source}</Plate>;
      if (k === "room_changed")
        return <Plate tone="change">аудитория{source}</Plate>;
      return <Plate tone="change">перенос{source}</Plate>;
    }
    case "deadline":
    case "deadline_reminder":
      return n.deadline?.authorRole === "group_head" ? (
        <Plate tone="head">дедлайн · от старосты</Plate>
      ) : (
        <Plate tone="warning">
          {n.kind === "deadline_reminder" ? "напоминание" : "дедлайн"}
        </Plate>
      );
    case "application_status":
      return <Plate tone="info">заявка</Plate>;
    case "announcement":
      return n.announcement?.authorRole === "group_head" ? (
        <Plate tone="head">объявление · от старосты</Plate>
      ) : (
        <Plate tone="neutral">объявление</Plate>
      );
  }
}

function target(n: Row["notification"]) {
  if (n.kind === "lesson_change" && n.lessonChange)
    return `/schedule?date=${mskDate(n.lessonChange.newStartsAt)}`;
  if (n.kind === "application_status") return "/requests";
  if (n.kind === "deadline" || n.kind === "deadline_reminder") return "/";
  return null;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const f: FilterKey =
    sp.f && Object.hasOwn(FILTERS, sp.f) ? (sp.f as FilterKey) : "all";
  const rows = await load(user.id, FILTERS[f].kinds);
  const fresh = rows.filter((r) => !r.readAt);
  const earlier = rows.filter((r) => r.readAt);

  // Показали новые — отмечаем прочитанными (только свои строки получателя)
  if (fresh.length) {
    await db.notificationRecipient.updateMany({
      where: { userId: user.id, id: { in: fresh.map((r) => r.id) } },
      data: { readAt: new Date() },
    });
  }

  const home = user.role === "staff" ? "/staff" : "/";

  return (
    <main className="cabinet-page flex flex-col lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)] lg:items-start lg:gap-6">
      <section
        aria-labelledby="feed-title"
        className="min-w-0 flex flex-col gap-3 bg-board px-3 pb-1 pt-2 text-board-text md:rounded-3xl md:p-6"
      >
        <Link
          href={home}
          className="-ml-1 flex min-h-11 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted no-underline"
        >
          <ChevronLeft size={20} aria-hidden />
          {user.role === "staff" ? "Заявки" : "Сегодня"}
        </Link>
        <div className="px-0.5">
          <h1
            id="feed-title"
            className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]"
          >
            Уведомления
          </h1>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
            {fresh.length ? `${fresh.length} новых` : "новых нет"}
          </p>
        </div>
        <nav aria-label="Фильтр" className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
            <Link
              key={key}
              href={key === "all" ? "/feed" : `/feed?f=${key}`}
              aria-current={f === key ? "true" : undefined}
              className={cn(
                "flex min-h-11 flex-none items-center rounded-full px-3 text-[13px] font-semibold no-underline",
                f === key ? "" : "bg-board-row text-board-text",
              )}
              style={
                f === key
                  ? { background: "var(--board-text)", color: "var(--board)" }
                  : undefined
              }
            >
              {FILTERS[key].label}
            </Link>
          ))}
        </nav>
        {fresh.length ? (
          <ul aria-label="Новые" className="m-0 mt-1 list-none p-0">
            {fresh.map((r) => {
              const href = target(r.notification);
              return (
                <li
                  key={r.id}
                  className="relative grid grid-cols-[58px_minmax(0,1fr)] gap-2.5 border-t border-board-line px-0.5 py-3"
                >
                  <i
                    aria-hidden
                    className="absolute -left-2 top-[19px] size-1.5 rounded-full bg-plate-change"
                  />
                  <Flaps
                    value={mskTime(r.notification.publishedAt)}
                    size="sm"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span>{plate(r.notification)}</span>
                    <b className="text-[15px] leading-5">
                      {r.notification.title}
                    </b>
                    {r.notification.body ? (
                      <span className="text-[13px] leading-[18px] text-board-muted">
                        {r.notification.body}
                      </span>
                    ) : null}
                    {href ? (
                      <Link
                        href={href}
                        className="flex min-h-11 items-center font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link no-underline"
                      >
                        Открыть ›
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-2 border-t border-board-line px-0.5 py-2">
            <EmptyIllustration
              scene={f === "deadlines" ? "deadlines" : "notifications"}
            />
            <p className="text-[15px]">
              {f === "deadlines"
                ? "Новых уведомлений о дедлайнах нет."
                : "Новых уведомлений нет. Если что-то перенесут — напишем первыми."}
            </p>
          </div>
        )}
      </section>

      <div className="flex min-w-0 flex-col px-4 pb-3 pt-3.5 md:mt-5 md:rounded-3xl md:bg-surface md:p-6 lg:mt-0">
        {earlier.length ? (
          <>
            <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
              Раньше
            </h2>
            <ul className="m-0 list-none border-b border-border p-0">
              {earlier.map((r) => {
                const d = r.notification.publishedAt;
                const href = target(r.notification);
                const content = (
                  <>
                    <span>{plate(r.notification)}</span>
                    <b className="text-[14.5px]">{r.notification.title}</b>
                  </>
                );
                return (
                  <li
                    key={r.id}
                    className="grid grid-cols-[58px_minmax(0,1fr)] gap-2.5 border-t border-border py-3"
                  >
                    <div className="text-[11px] font-bold uppercase leading-5 tracking-[0.12em] text-text-muted">
                      {mskDate(d) === mskDate() ? "" : weekdayShort(mskDate(d))}{" "}
                      {mskTime(d)}
                    </div>
                    {href ? (
                      <Link
                        href={href}
                        className="flex min-w-0 flex-col gap-[3px] text-text no-underline"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-col gap-[3px]">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
        <p className="mt-3.5 text-[13px] leading-[18px] text-text-muted">
          Важное дублируем в push и на почту — включается в{" "}
          <Link href="/profile" className="underline underline-offset-2">
            профиле
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
