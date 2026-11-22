"use server";

import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";

/** Чтение подтверждает открытый экран, а не предварительная загрузка ссылки. */
export async function markNotificationsRead(ids: string[]) {
  const user = await requireUser();
  if (
    !Array.isArray(ids) ||
    ids.length > 50 ||
    ids.some(
      (id) =>
        typeof id !== "string" ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id),
    )
  )
    notFound();
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const owned = await db.notificationRecipient.count({
    where: { userId: user.id, id: { in: unique } },
  });
  if (owned !== unique.length) notFound();
  await db.notificationRecipient.updateMany({
    where: { userId: user.id, id: { in: unique }, readAt: null },
    data: { readAt: new Date() },
  });
}
