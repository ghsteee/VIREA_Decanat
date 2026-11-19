"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { pickupSlotAvailable } from "@/server/pickup";
import { requireUser } from "@/server/auth/guards";
import type { Field } from "@/server/applications";

export type SubmitState = { error?: string };
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const SLOT_UNAVAILABLE =
  "Это окно больше недоступно. Обнови страницу и выбери другое.";

/** A1, A2: заявка из каталога; данные профиля подставляет сервер. */
export async function submitApplication(
  _prev: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  const user = await requireUser();
  if (!user.studentProfileId || !user.groupId)
    return { error: "Заявки подают студенты." };

  const typeId = String(form.get("typeId") ?? "");
  if (!UUID.test(typeId)) return { error: "Такой справки нет в каталоге." };
  const type = await db.applicationType.findUnique({ where: { id: typeId } });
  if (!type) return { error: "Такой справки нет в каталоге." };

  const data: Record<string, string | number> = {};
  for (const f of type.fields as Field[]) {
    const raw = String(form.get(`f_${f.key}`) ?? "").trim();
    if (!raw) {
      if (f.required) return { error: `Заполни поле «${f.label}».` };
      continue;
    }
    if (f.type === "number") {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > (f.max ?? 10))
        return { error: `«${f.label}»: от 1 до ${f.max ?? 10}.` };
      data[f.key] = n;
    } else {
      if (raw.length > 300)
        return { error: `«${f.label}»: не больше 300 символов.` };
      data[f.key] = raw;
    }
  }

  const delivery = String(form.get("delivery") ?? "");
  if (!type.deliveryMethods.includes(delivery as never))
    return { error: "Выбери способ получения." };

  const slotId = String(form.get("slotId") ?? "") || null;
  if (slotId && (delivery !== "pickup" || !UUID.test(slotId)))
    return { error: SLOT_UNAVAILABLE };

  // Повторная подача — только своей отклонённой заявки
  const previousId = String(form.get("previousId") ?? "") || null;
  if (previousId) {
    if (!UUID.test(previousId)) return { error: "Заявка не найдена." };
    const prev = await db.application.findFirst({
      where: {
        id: previousId,
        studentId: user.studentProfileId,
        status: "rejected",
        resubmission: null,
      },
    });
    if (!prev) return { error: "Эту заявку уже подали заново." };
  }

  const profile = await db.studentProfile.findUniqueOrThrow({
    where: { id: user.studentProfileId },
    include: { group: { include: { institute: true } } },
  });

  let id: string;
  try {
    const app = await db.$transaction(async (tx) => {
      if (
        slotId &&
        !(await pickupSlotAvailable(
          tx,
          slotId,
          profile.group.instituteId,
          profile.groupId,
        ))
      )
        return null;
      return tx.application.create({
        data: {
          studentId: profile.id,
          typeId: type.id,
          submissionGroupId: profile.groupId,
          formData: data,
          profileSnapshot: {
            lastName: profile.lastName,
            firstName: profile.firstName,
            middleName: profile.middleName,
            group: profile.group.code,
            course: profile.group.course,
            institute: profile.group.institute.code,
            studyForm: profile.studyForm,
            funding: profile.funding,
          },
          deliveryMethod: delivery as "pickup" | "electronic",
          previousId,
          ...(slotId ? { reservation: { create: { slotId } } } : {}),
          events: {
            create: { version: 1, toStatus: "submitted", authorId: user.id },
          },
        },
      });
    });
    if (!app) return { error: SLOT_UNAVAILABLE };
    id = app.id;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const columns = e.meta?.target;
      if (slotId && Array.isArray(columns) && columns.includes("slotId"))
        return { error: SLOT_UNAVAILABLE };
      return { error: "Эту заявку уже подали заново." };
    }
    throw e;
  }
  revalidatePath("/requests");
  redirect(`/requests/${id}?done=1`);
}
