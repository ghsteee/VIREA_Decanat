"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/guards";
import {
  NEXT,
  requireStaffApplication,
  STATUS_LABEL,
} from "@/server/applications";

export type StatusState = { error?: string };

const TITLE = {
  in_progress: "Заявка в работе",
  ready: "Справка готова",
  issued: "Справка выдана",
  rejected: "Заявку вернули",
} as const;

/** E1, A4: смена статуса заявки с историей и уведомлением владельцу. */
export async function changeStatus(
  _prev: StatusState,
  form: FormData,
): Promise<StatusState> {
  const user = await requireStaff();
  const id = String(form.get("id") ?? "");
  const version = Number(form.get("version"));
  const to = String(form.get("to") ?? "") as keyof typeof STATUS_LABEL;
  const reason = String(form.get("reason") ?? "").trim();
  const pickup = String(form.get("pickup") ?? "").trim();

  const app = await requireStaffApplication(user.id, id);
  if (!NEXT[app.status].includes(to))
    return { error: "Такой переход статуса недоступен." };
  if (to === "rejected" && (!reason || reason.length > 300)) {
    return {
      error:
        "При отказе нужна причина: студент увидит её и сможет подать снова.",
    };
  }
  if (to === "ready" && (!pickup || pickup.length > 200))
    return { error: "Напиши, где и когда забрать." };

  const owner = await db.studentProfile.findUniqueOrThrow({
    where: { id: app.studentId },
    select: { userId: true },
  });

  try {
    await db.$transaction(async (tx) => {
      const res = await tx.application.updateMany({
        where: { id: app.id, version },
        data: { status: to, version: { increment: 1 } },
      });
      if (res.count !== 1) throw new Error("conflict");
      const ev = await tx.applicationStatusEvent.create({
        data: {
          applicationId: app.id,
          version: version + 1,
          fromStatus: app.status,
          toStatus: to,
          authorId: user.id,
          rejectReason: to === "rejected" ? reason : null,
          pickupNote: to === "ready" ? pickup : null,
        },
      });
      await tx.notification.create({
        data: {
          kind: "application_status",
          importance: to === "ready" || to === "rejected" ? "urgent" : "normal",
          eventKey: `application:${app.id}:v${version + 1}`,
          title: `${TITLE[to as keyof typeof TITLE]}: ${app.type.title.toLowerCase()}`,
          body: to === "rejected" ? reason : to === "ready" ? pickup : null,
          statusEventId: ev.id,
          recipients: { create: [{ userId: owner.userId }] },
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "conflict")
      return { error: "Заявку уже обновили. Обнови страницу." };
    throw e;
  }
  revalidatePath("/staff");
  redirect(`/staff/requests/${app.id}?done=1`);
}
