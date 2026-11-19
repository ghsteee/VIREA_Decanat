import { pickupLabel } from "@/server/pickup";
import Link from "next/link";
import { ConceptNote } from "@/components/concept-note";
import { requireStaff } from "@/server/auth/guards";
import {
  NEXT,
  STATUS_LABEL,
  num,
  requireStaffApplication,
  type Field,
} from "@/server/applications";
import { db } from "@/server/db";
import { Flaps } from "@/components/board/flaps";
import { StatusForm } from "@/components/staff/status-form";
import { dayMonth, mskDate, mskTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function StaffRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const user = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const app = await requireStaffApplication(user.id, id);
  const snap = app.profileSnapshot as {
    lastName: string;
    firstName: string;
    middleName?: string | null;
    group: string;
    course?: number;
  };
  const data = app.formData as Record<string, string | number>;
  const authors = await db.user.findMany({
    where: { id: { in: app.events.map((e) => e.authorId) } },
    select: { id: true, role: true, login: true },
  });
  const who = (uid: string) =>
    authors.find((a) => a.id === uid)?.role === "staff"
      ? "дирекция"
      : "студент";
  const options = NEXT[app.status];

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-4 bg-board px-4 pb-6 pt-4 text-board-text">
      <Link
        href="/staff"
        className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted"
      >
        ‹ Очередь заявок
      </Link>
      {sp.done ? (
        <p
          role="status"
          className="m-0 rounded-lg bg-plate-success px-3 py-2 text-[14px] font-semibold text-plate-ink"
        >
          Сохранено. Студент получил уведомление.
        </p>
      ) : null}
      <section className="flex flex-col gap-3.5 rounded-2xl bg-board-row p-5">
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <h1 className="m-0 font-board text-[28px] font-extrabold uppercase leading-7 tracking-[0.03em]">
              {app.type.title}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-board-muted">
              {snap.lastName} {snap.firstName} {snap.middleName} · {snap.group}
              {snap.course ? ` · ${snap.course} курс` : ""}
            </p>
          </div>
          <Flaps value={num(app.number)} size="sm" />
        </div>
        <dl className="m-0 grid grid-cols-[120px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-[13.5px]">
          {(app.type.fields as Field[]).map((f) =>
            data[f.key] !== undefined ? (
              <div key={f.key} className="contents">
                <dt className="text-board-muted">{f.label}</dt>
                <dd className="m-0">{String(data[f.key])}</dd>
              </div>
            ) : null,
          )}
          <dt className="text-board-muted">Получение</dt>
          <dd className="m-0">
            {app.deliveryMethod === "pickup"
              ? app.reservation
                ? pickupLabel(app.reservation.slot)
                : "в дирекции"
              : "электронно"}
          </dd>
          <dt className="text-board-muted">Статус</dt>
          <dd className="m-0 font-board text-[15px] font-bold uppercase tracking-[0.06em]">
            {STATUS_LABEL[app.status]}
          </dd>
        </dl>
        {options.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
              Сменить статус
            </span>
            <StatusForm
              id={app.id}
              version={app.version}
              options={options}
              readyNote={
                app.reservation ? pickupLabel(app.reservation.slot) : undefined
              }
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
            История
          </span>
          <ol className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
            {app.events.map((e) => (
              <li key={e.id}>
                <span className="inline-block w-[92px] text-board-muted">
                  {dayMonth(mskDate(e.createdAt))} {mskTime(e.createdAt)}
                </span>
                {STATUS_LABEL[e.toStatus]} · {who(e.authorId)}
                {e.rejectReason ? ` — ${e.rejectReason}` : ""}
                {e.pickupNote ? ` — ${e.pickupNote}` : ""}
              </li>
            ))}
          </ol>
        </div>
      </section>
      <ConceptNote className="text-[11px] text-board-muted" />
    </main>
  );
}
