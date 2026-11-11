"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";

/** D3: отметка «сделано» у дедлайна своей группы. Чужой дедлайн — тихий отказ. */
export async function toggleDeadlineDone(deadlineId: string, done: boolean) {
  const user = await requireUser();
  if (!user.studentProfileId || !user.groupId) return;
  const allowed = await db.deadlineGroup.findFirst({
    where: { deadlineId, groupId: user.groupId },
    select: { deadlineId: true },
  });
  if (!allowed) return;

  const key = { deadlineId, studentId: user.studentProfileId };
  if (done) {
    await db.deadlineProgress.upsert({
      where: { deadlineId_studentId: key },
      create: { ...key, completedAt: new Date() },
      update: {},
    });
  } else {
    await db.deadlineProgress.deleteMany({ where: key });
  }
  revalidatePath("/");
}
