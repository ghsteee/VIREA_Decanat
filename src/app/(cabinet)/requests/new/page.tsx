import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { listPickupSlots } from "@/server/pickup";
import { ApplicationForm } from "@/components/application-form";
import { ConceptNote } from "@/components/concept-note";
import type { Field } from "@/server/applications";

export const dynamic = "force-dynamic";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string }>;
}) {
  const user = await requireUser();
  if (!user.studentProfileId) redirect("/staff");
  const sp = await searchParams;
  const type = sp.type
    ? await db.applicationType.findUnique({ where: { code: sp.type } })
    : null;
  if (!type) notFound();

  const profile = await db.studentProfile.findUniqueOrThrow({
    where: { id: user.studentProfileId },
    include: { group: { include: { institute: true } } },
  });
  const slots = type.deliveryMethods.includes("pickup")
    ? await listPickupSlots(profile.group.instituteId, profile.groupId)
    : [];
  // Повторная подача: берём поля только из своей отклонённой заявки
  const prev =
    sp.from && /^[0-9a-f-]{36}$/i.test(sp.from)
      ? await db.application.findFirst({
          where: {
            id: sp.from,
            studentId: profile.id,
            status: "rejected",
            typeId: type.id,
          },
        })
      : null;

  return (
    <main className="mx-auto flex max-w-[480px] flex-col">
      <section className="flex flex-col gap-3 bg-board px-3.5 pb-4 pt-2 text-board-text">
        <Link
          href="/requests"
          className="-ml-1 flex min-h-11 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted no-underline"
        >
          <ChevronLeft size={20} aria-hidden />
          Заявки
        </Link>
        <h1 className="m-0 font-board text-[30px] font-extrabold uppercase leading-[32px] tracking-[0.03em]">
          {type.title}
        </h1>
        <p className="m-0 text-[13px] text-board-muted">
          Обычно {type.leadTime}. Напишем, когда будет готово.
        </p>
        <dl className="m-0 grid grid-cols-[110px_minmax(0,1fr)] gap-x-2.5 gap-y-1 rounded-[10px] bg-board-row p-3 text-[14px]">
          <dt className="text-board-muted">Студент</dt>
          <dd className="m-0">
            {profile.lastName} {profile.firstName} {profile.middleName}
          </dd>
          <dt className="text-board-muted">Группа</dt>
          <dd className="m-0">
            {profile.group.code} · {profile.group.course} курс ·{" "}
            {profile.group.institute.code}
          </dd>
          <dt className="text-board-muted">Форма</dt>
          <dd className="m-0">
            {profile.studyForm === "full_time" ? "очная" : "заочная"} ·{" "}
            {profile.funding === "budget" ? "бюджет" : "договор"}
          </dd>
        </dl>
        <p className="m-0 text-[12.5px] text-board-muted">
          Данные из профиля подставятся сами. Если что-то не так — напиши в
          дирекцию.
        </p>
      </section>
      <div className="flex flex-col gap-4 px-4 py-4">
        {prev ? (
          <p className="m-0 rounded-lg border border-plate-danger p-3 text-[14px] text-danger-text">
            Прошлый раз вернули:{" "}
            {
              (
                await db.applicationStatusEvent.findFirst({
                  where: { applicationId: prev.id, toStatus: "rejected" },
                })
              )?.rejectReason
            }
          </p>
        ) : null}
        <ApplicationForm
          typeId={type.id}
          fields={type.fields as Field[]}
          delivery={type.deliveryMethods}
          slots={slots}
          previousId={prev?.id}
          defaults={
            prev
              ? (prev.formData as Record<string, string | number>)
              : undefined
          }
        />
        <ConceptNote />
      </div>
    </main>
  );
}
