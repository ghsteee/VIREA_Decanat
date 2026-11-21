import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { EmptyIllustration } from "@/components/empty-illustration";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Flaps } from "@/components/board/flaps";
import { VerticalRoute } from "@/components/board/vertical-route";
import { STATUS_LABEL, num } from "@/server/applications";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEP = {
  submitted: 1,
  in_progress: 2,
  ready: 3,
  issued: 4,
  rejected: 0,
} as const;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "staff") redirect("/staff");
  if (!user.studentProfileId) redirect("/profile");
  const view = (await searchParams).view === "all" ? "all" : "active";
  const activeFilter: Prisma.ApplicationWhereInput = {
    studentId: user.studentProfileId,
    OR: [
      { status: { notIn: ["issued", "rejected"] } },
      { status: "rejected", resubmission: null },
    ],
  };

  const [apps, types, total, activeCount] = await Promise.all([
    db.application.findMany({
      where:
        view === "all" ? { studentId: user.studentProfileId } : activeFilter,
      include: {
        type: true,
        events: { orderBy: { version: "asc" } },
        resubmission: { select: { id: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
    db.applicationType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.application.count({ where: { studentId: user.studentProfileId } }),
    db.application.count({ where: activeFilter }),
  ]);
  const active = apps.filter(
    (a) =>
      a.status !== "issued" && !(a.status === "rejected" && a.resubmission),
  );
  const shown = view === "all" ? apps : active;
  const top =
    view === "active"
      ? (active.find((a) => a.status === "ready") ??
        active.find((a) => a.status !== "rejected"))
      : undefined;
  const rest = shown.filter((a) => a !== top);

  return (
    <main className="cabinet-page cabinet-columns flex flex-col lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)] lg:gap-6">
      <section
        aria-labelledby="rq-title"
        className="min-w-0 flex flex-col gap-4 bg-board px-3.5 pb-3.5 pt-4 text-board-text md:rounded-3xl md:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              id="rq-title"
              className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]"
            >
              Заявки
            </h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
              Текущие: {activeCount} · Всего: {total}
            </p>
          </div>
          <Link
            href="#request-catalog"
            aria-label="Новая заявка"
            className="flex min-h-11 shrink-0 items-center rounded-xl bg-action px-4 text-sm font-semibold text-on-action no-underline"
          >
            Заказать
          </Link>
        </div>

        <nav aria-label="Список заявок" className="flex flex-wrap gap-2">
          {(
            [
              { key: "active", label: "Текущие", count: activeCount },
              { key: "all", label: "История", count: total },
            ] as const
          ).map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/requests?view=all" : "/requests"}
              aria-current={view === tab.key ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold no-underline",
                view === tab.key
                  ? "bg-board-text text-board"
                  : "bg-board-row text-board-text",
              )}
            >
              {tab.label}
              <span className="text-xs opacity-75">{tab.count}</span>
            </Link>
          ))}
        </nav>

        {top ? (
          <article className="flex flex-col gap-3.5 rounded-[10px] bg-board-row px-3 pb-3 pt-3.5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="m-0 font-board text-xl font-extrabold uppercase leading-[22px] tracking-[0.03em]">
                <Link
                  href={`/requests/${top.id}`}
                  className="text-board-text no-underline"
                >
                  {top.type.title}
                </Link>
              </h2>
              <Flaps
                value={num(top.number)}
                label={`Номер ${num(top.number)}`}
                size="sm"
              />
            </div>
            <VerticalRoute status={top.status} events={top.events} />
            <Link
              href={`/requests/${top.id}`}
              className="flex min-h-11 items-center justify-between border-t border-board-line pt-1 font-semibold text-board-link no-underline"
            >
              Открыть заявку<span aria-hidden>→</span>
            </Link>
          </article>
        ) : null}

        {rest.map((a) =>
          a.status === "rejected" ? (
            <div
              key={a.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 rounded-[10px] border border-plate-danger bg-board-row p-3"
            >
              <span className="font-board text-[17px] font-extrabold uppercase tracking-[0.03em]">
                {a.type.title}
              </span>
              <span className="rounded-[3px] bg-plate-danger px-[5px] font-board text-[15px] font-bold uppercase tracking-[0.06em] text-white">
                отказ
              </span>
              <span className="col-span-2 text-[13px] leading-[18px] text-board-danger-text">
                {a.events.at(-1)?.rejectReason}
              </span>
              <Link
                href={
                  a.resubmission
                    ? `/requests/${a.resubmission.id}`
                    : `/requests/new?type=${a.type.code}&from=${a.id}`
                }
                className="col-span-2 flex h-11 items-center justify-center rounded-[10px] bg-action font-semibold text-on-action no-underline"
              >
                {a.resubmission ? "Открыть повторную заявку" : "Подать снова"}
              </Link>
            </div>
          ) : (
            <Link
              key={a.id}
              href={`/requests/${a.id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 rounded-[10px] bg-board-row p-3 text-board-text no-underline"
            >
              <span className="font-board text-[17px] font-extrabold uppercase tracking-[0.03em]">
                {a.type.title}
              </span>
              <span className="font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link">
                {STATUS_LABEL[a.status]}
              </span>
              <span
                aria-hidden
                className="col-span-2 grid grid-cols-4 gap-[3px]"
              >
                {[1, 2, 3, 4].map((i) => (
                  <i
                    key={i}
                    className={cn(
                      "h-1 rounded-sm bg-board-line",
                      i < STEP[a.status] && "bg-board-link",
                      i === STEP[a.status] && "bg-plate-change",
                    )}
                  />
                ))}
              </span>
              <span className="col-span-2 text-[12.5px] text-board-muted">
                № {num(a.number)} · обычно {a.type.leadTime}
              </span>
            </Link>
          ),
        )}
        {!shown.length ? (
          <div className="empty-state">
            <EmptyIllustration scene="requests" />
            <p className="m-0 text-[15px]">
              {total
                ? "Текущих заявок нет. Завершённые сохранены в истории."
                : "Заявок пока нет. Закажи справку и следи за её статусом здесь."}
            </p>
            <Link
              href={total ? "/requests?view=all" : "#request-catalog"}
              className="flex min-h-11 items-center justify-center rounded-xl bg-action px-4 py-2 text-sm font-semibold text-on-action no-underline"
            >
              {total ? "Открыть историю" : "Выбрать справку"}
            </Link>
          </div>
        ) : null}
      </section>

      <div className="flex min-w-0 flex-col px-4 pb-3 pt-4 md:mt-5 md:rounded-3xl md:bg-surface md:p-6 lg:mt-0">
        <h2
          id="request-catalog"
          className="mb-3 scroll-mt-4 font-board text-[22px] font-extrabold uppercase leading-[26px] tracking-[0.03em]"
        >
          Новая заявка
        </h2>
        <ul className="m-0 list-none border-b border-border p-0">
          {types.map((t) => (
            <li key={t.id}>
              <Link
                href={`/requests/new?type=${t.code}`}
                className="flex min-h-[60px] items-center justify-between gap-3 border-t border-border py-3 text-text no-underline"
              >
                <b className="min-w-0 text-sm leading-5">{t.title}</b>
                <span className="shrink-0 font-board text-[15px] font-bold uppercase tracking-[0.06em] text-text-muted">
                  {t.leadTime} ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
