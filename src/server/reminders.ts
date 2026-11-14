import "server-only";
import { db } from "@/server/db";
import { enqueueDeliveries } from "@/server/delivery";
import { dayMonth, mskDate, mskTime, weekdayShort } from "@/lib/time";

/** Напоминание старше этого не отправляем: после простоя сервера оно уже неуместно. */
const STALE_MS = 6 * 60 * 60 * 1000;

/**
 * D2: напоминания за 3 дня и за 1 день. Забираем созревшие задания атомарно
 * (два обработчика не возьмут одно), проверяем версию срока и отметку «сделано».
 */
export async function processReminders(limit = 20) {
  return db.$transaction(
    async (tx) => {
      const due = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "DeadlineReminder" SET "status" = 'sent'
    WHERE "id" IN (
      SELECT "id" FROM "DeadlineReminder"
      WHERE "status" = 'scheduled' AND "scheduledAt" <= now()
      ORDER BY "scheduledAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;

      for (const { id } of due) {
        const r = await tx.deadlineReminder.findUnique({
          where: { id },
          include: {
            deadline: {
              include: {
                groups: true,
                progress: { select: { studentId: true } },
              },
            },
          },
        });
        if (!r) continue;
        const d = r.deadline;
        // Срок перенесли или напоминание устарело — не отправляем
        if (
          r.dueVersion !== d.dueVersion ||
          Date.now() - r.scheduledAt.getTime() > STALE_MS ||
          d.dueAt <= new Date()
        ) {
          await tx.deadlineReminder.update({
            where: { id },
            data: { status: "cancelled" },
          });
          continue;
        }
        const doneIds = new Set(d.progress.map((p) => p.studentId));
        const students = await tx.studentProfile.findMany({
          where: {
            groupId: { in: d.groups.map((g) => g.groupId) },
            user: { disabledAt: null },
          },
          select: { id: true, userId: true },
        });
        const recipients = students
          .filter((s) => !doneIds.has(s.id))
          .map((s) => s.userId);
        if (!recipients.length) continue;

        const when = `${weekdayShort(mskDate(d.dueAt))} ${dayMonth(mskDate(d.dueAt))}, ${mskTime(d.dueAt)}`;
        const n = await tx.notification.create({
          data: {
            kind: "deadline_reminder",
            importance: "urgent",
            eventKey: `reminder:${r.id}`,
            title: `${r.offset === "d1" ? "Завтра" : "Через 3 дня"}: ${d.title}`,
            body: `Срок — ${when}. Сделал? Отметь в «Сегодня», и напоминания прекратятся.`,
            deadlineId: d.id,
            recipients: { create: recipients.map((userId) => ({ userId })) },
          },
        });
        await enqueueDeliveries(tx, n.id);
      }
      return due.length;
    },
    { timeout: 15_000 },
  );
}
