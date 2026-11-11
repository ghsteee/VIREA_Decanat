import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { notFound } from "next/navigation";
import { requireOwnApplication, num, type Field } from "@/server/applications";
import { Flaps } from "@/components/board/flaps";
import { VerticalRoute } from "@/components/board/vertical-route";
import { ConceptNote } from "@/components/concept-note";

export const dynamic = "force-dynamic";

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const user = await requireUser();
  if (!user.studentProfileId) notFound();
  const { id } = await params;
  const sp = await searchParams;
  const app = await requireOwnApplication(user.studentProfileId, id);
  const data = app.formData as Record<string, string | number>;
  const fields = app.type.fields as Field[];
  const rejected = app.events.find((e) => e.toStatus === "rejected");

  return (
    <main className="mx-auto flex max-w-[480px] flex-col">
      <section className="flex flex-col gap-4 bg-board px-3.5 pb-4 pt-2 text-board-text">
        <Link
          href="/requests"
          className="-ml-1 flex min-h-11 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted no-underline"
        >
          <ChevronLeft size={20} aria-hidden />
          Заявки
        </Link>
        {sp.done ? (
          <p
            role="status"
            className="m-0 rounded-lg bg-plate-success px-3 py-2 text-[14px] font-semibold text-plate-ink"
          >
            Заявка отправлена. Напишем, когда изменится статус.
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-2">
          <h1 className="m-0 font-board text-[30px] font-extrabold uppercase leading-[32px] tracking-[0.03em]">
            {app.type.title}
          </h1>
          <Flaps
            value={num(app.number)}
            label={`Номер ${num(app.number)}`}
            size="sm"
          />
        </div>
        {rejected ? (
          <div className="flex flex-col gap-2 rounded-[10px] border border-plate-danger bg-board-row p-3">
            <span className="font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-danger-text">
              Отказ
            </span>
            <span className="text-[13px] leading-[18px] text-board-danger-text">
              {rejected.rejectReason}
            </span>
            <Link
              href={`/requests/new?type=${app.type.code}&from=${app.id}`}
              className="flex h-11 items-center justify-center rounded-[10px] bg-action font-semibold text-on-action no-underline"
            >
              Подать снова
            </Link>
          </div>
        ) : (
          <div className="rounded-[10px] bg-board-row px-3 py-3.5">
            <VerticalRoute status={app.status} events={app.events} />
          </div>
        )}
      </section>
      <div className="flex flex-col gap-3 px-4 py-4">
        <dl className="m-0 grid grid-cols-[130px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-[14px]">
          {fields.map((f) =>
            data[f.key] !== undefined ? (
              <div key={f.key} className="contents">
                <dt className="text-text-muted">{f.label}</dt>
                <dd className="m-0">{String(data[f.key])}</dd>
              </div>
            ) : null,
          )}
          <dt className="text-text-muted">Получение</dt>
          <dd className="m-0">
            {app.deliveryMethod === "pickup"
              ? "в дирекции, кабинет 214"
              : "электронно"}
          </dd>
        </dl>
        <ConceptNote />
      </div>
    </main>
  );
}
