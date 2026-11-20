import Link from "next/link";
import { requireStaff } from "@/server/auth/guards";
import { db } from "@/server/db";
import { staffInstituteIds } from "@/server/staff";
import { STATUS_LABEL, num } from "@/server/applications";
import { Flaps } from "@/components/board/flaps";
import { ConceptNote } from "@/components/concept-note";
import { dayMonth, mskDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: Record<
  string,
  { label: string; statuses: ApplicationStatus[] }
> = {
  active: {
    label: "Активные",
    statuses: ["submitted", "in_progress", "ready"],
  },
  submitted: { label: "Новые", statuses: ["submitted"] },
  in_progress: { label: "В работе", statuses: ["in_progress"] },
  ready: { label: "Готовы", statuses: ["ready"] },
  done: { label: "Закрытые", statuses: ["issued", "rejected"] },
};
const STEP = {
  submitted: 1,
  in_progress: 2,
  ready: 3,
  issued: 4,
  rejected: 0,
} as const;
const TONE: Record<ApplicationStatus, string> = {
  submitted: "text-board-soon",
  in_progress: "text-board-link",
  ready: "text-board-ok",
  issued: "text-board-dim",
  rejected: "text-board-danger-text",
};

export default async function StaffQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; type?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const f = sp.s && sp.s in FILTERS ? sp.s : "active";
  const institutes = await staffInstituteIds(user.id);
  const scope = { submissionGroup: { instituteId: { in: institutes } } };
  const [apps, counts, types] = await Promise.all([
    db.application.findMany({
      where: {
        ...scope,
        status: { in: FILTERS[f].statuses },
        ...(sp.type ? { type: { code: sp.type } } : {}),
      },
      include: { type: true, submissionGroup: { select: { code: true } } },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
    db.application.groupBy({ by: ["status"], where: scope, _count: true }),
    db.applicationType.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const count = (s: ApplicationStatus[]) =>
    counts
      .filter((c) => s.includes(c.status))
      .reduce((n, c) => n + c._count, 0);
  const href = (s: string, t?: string) =>
    `/staff?s=${s}${t ? `&type=${t}` : ""}`;

  return (
    <main className="cabinet-page flex min-h-dvh flex-col gap-4 bg-board px-4 pb-6 pt-4 text-board-text lg:px-8 lg:pt-7 md:rounded-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em] lg:text-[46px] lg:leading-[44px]">
            Очередь заявок
          </h1>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
            {count(["submitted"])} новых · {count(["in_progress"])} в работе
          </p>
        </div>
        <Flaps
          value={String(count(FILTERS.active.statuses))}
          label="Активных заявок"
          size="lg"
        />
      </div>
      <nav
        aria-label="Фильтр по статусу"
        className="-mr-4 flex gap-1.5 overflow-x-auto pr-4"
      >
        {Object.entries(FILTERS).map(([k, v]) => (
          <Link
            key={k}
            href={href(k, sp.type)}
            aria-current={f === k ? "true" : undefined}
            className={cn(
              "flex h-9 flex-none items-center rounded-full px-3.5 text-[13px] font-semibold no-underline",
              f === k ? "" : "bg-board-row text-board-text",
            )}
            style={
              f === k
                ? { background: "var(--board-text)", color: "var(--board)" }
                : undefined
            }
          >
            {v.label} · {count(v.statuses)}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Фильтр по типу"
        className="-mr-4 flex gap-1.5 overflow-x-auto pr-4"
      >
        <Link
          href={href(f)}
          aria-current={!sp.type ? "true" : undefined}
          className={cn(
            "flex h-9 flex-none items-center rounded-full px-3 text-[12.5px] no-underline",
            !sp.type
              ? "bg-board-row font-bold text-board-text"
              : "text-board-muted",
          )}
        >
          Все типы
        </Link>
        {types.map((t) => (
          <Link
            key={t.id}
            href={href(f, t.code)}
            aria-current={sp.type === t.code ? "true" : undefined}
            className={cn(
              "flex h-9 flex-none items-center rounded-full px-3 text-[12.5px] no-underline",
              sp.type === t.code
                ? "bg-board-row font-bold text-board-text"
                : "text-board-muted",
            )}
          >
            {t.title}
          </Link>
        ))}
      </nav>
      <div role="table" aria-label="Заявки">
        {apps.map((a) => {
          const snap = a.profileSnapshot as {
            lastName: string;
            firstName: string;
            middleName?: string | null;
          };
          return (
            <Link
              role="row"
              key={a.id}
              href={`/staff/requests/${a.id}`}
              className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-board-line px-1 py-2.5 text-board-text no-underline lg:grid-cols-[96px_minmax(0,1.4fr)_minmax(0,1.2fr)_74px_110px]"
            >
              <span role="cell">
                <Flaps
                  value={num(a.number)}
                  size="sm"
                  tone={a.status === "issued" ? "dim" : "default"}
                />
              </span>
              <span role="cell" className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-board text-[18px] font-extrabold uppercase tracking-[0.03em]">
                  {a.type.title}
                </span>
                <span
                  aria-hidden
                  className="grid w-[120px] grid-cols-4 gap-[3px]"
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
              </span>
              <span
                role="cell"
                className={cn(
                  "text-right font-board text-[15px] font-bold uppercase tracking-[0.06em] lg:order-last",
                  TONE[a.status],
                )}
              >
                {STATUS_LABEL[a.status]}
              </span>
              <span
                role="cell"
                className="col-span-2 min-w-0 truncate text-[13px] lg:col-span-1"
              >
                <b>
                  {snap.lastName} {snap.firstName[0]}.
                  {snap.middleName ? ` ${snap.middleName[0]}.` : ""}
                </b>{" "}
                <span className="text-board-muted">
                  {a.submissionGroup.code}
                </span>
              </span>
              <span
                role="cell"
                className="text-right text-[13px] text-board-muted lg:text-left"
              >
                {dayMonth(mskDate(a.submittedAt))}
              </span>
            </Link>
          );
        })}
        {!apps.length ? (
          <p className="border-t border-board-line py-6 text-center text-[15px]">
            Заявок с таким фильтром нет.
          </p>
        ) : null}
      </div>
      <ConceptNote className="mt-auto text-[11px] text-board-muted" />
    </main>
  );
}
