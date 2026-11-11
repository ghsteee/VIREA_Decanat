import "server-only";
import { db } from "@/server/db";
import { sendPush } from "@/server/push";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 60_000;

/**
 * Создать задания доставки push для новых уведомлений и сразу попробовать отправить.
 * Ключ (получатель, канал, подписка) уникален — повтор не создаёт дублей.
 */
export async function afterPublish(notificationIds: string[]) {
  if (!notificationIds.length) return;
  const recipients = await db.notificationRecipient.findMany({
    where: { notificationId: { in: notificationIds } },
    select: { id: true, userId: true },
  });
  const subs = await db.pushSubscription.findMany({
    where: { userId: { in: recipients.map((r) => r.userId) }, revokedAt: null },
    select: { id: true, userId: true },
  });
  const rows = recipients.flatMap((r) =>
    subs
      .filter((s) => s.userId === r.userId)
      .map((s) => ({
        recipientId: r.id,
        channel: "webPush" as const,
        pushSubscriptionId: s.id,
        destinationKey: s.id,
      })),
  );
  if (rows.length)
    await db.notificationDelivery.createMany({
      data: rows,
      skipDuplicates: true,
    });
  // Не ждём отправку: ответ сотруднику не должен зависеть от push-сервисов
  void processDeliveries().catch((e) =>
    console.error("push delivery failed", e),
  );
}

/** Забрать готовые задания (с арендой, чтобы два обработчика не взяли одно) и отправить. */
export async function processDeliveries(limit = 50) {
  const leased = await db.$queryRaw<{ id: string }[]>`
    UPDATE "NotificationDelivery" SET "status" = 'leased', "leaseExpiresAt" = now() + ${`${LEASE_MS} milliseconds`}::interval
    WHERE "id" IN (
      SELECT "id" FROM "NotificationDelivery"
      WHERE "channel" = 'webPush'
        AND ("status" = 'pending' OR ("status" = 'leased' AND "leaseExpiresAt" < now()))
        AND "nextAttemptAt" <= now()
      ORDER BY "nextAttemptAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;
  for (const { id } of leased) {
    const d = await db.notificationDelivery.findUnique({
      where: { id },
      include: {
        pushSubscription: true,
        recipient: {
          include: {
            notification: {
              include: { lessonChange: { select: { newStartsAt: true } } },
            },
          },
        },
      },
    });
    if (!d?.pushSubscription) continue;
    const sub = d.pushSubscription;
    const n = d.recipient.notification;
    // Перед отправкой: подписка ещё действует
    if (sub.revokedAt) {
      await db.notificationDelivery.update({
        where: { id },
        data: { status: "cancelled", leaseExpiresAt: null },
      });
      continue;
    }
    const url =
      n.kind === "lesson_change"
        ? "/schedule"
        : n.kind === "application_status"
          ? "/requests"
          : "/feed";
    const result = await sendPush(sub, {
      title: n.title,
      body: n.body ?? undefined,
      url,
      tag: n.eventKey,
    });
    const attempts = d.attempts + 1;
    if (result === "accepted") {
      await db.notificationDelivery.update({
        where: { id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
          attempts,
          leaseExpiresAt: null,
        },
      });
    } else if (result === "gone") {
      await db.$transaction([
        db.pushSubscription.update({
          where: { id: sub.id },
          data: { revokedAt: new Date() },
        }),
        db.notificationDelivery.update({
          where: { id },
          data: {
            status: "failed",
            attempts,
            lastErrorCode: "gone",
            leaseExpiresAt: null,
          },
        }),
      ]);
    } else if (result === "disabled") {
      await db.notificationDelivery.update({
        where: { id },
        data: {
          status: "failed",
          lastErrorCode: "vapid-not-configured",
          leaseExpiresAt: null,
        },
      });
    } else {
      const done = attempts >= MAX_ATTEMPTS;
      await db.notificationDelivery.update({
        where: { id },
        data: {
          status: done ? "failed" : "pending",
          attempts,
          lastErrorCode: "retry",
          leaseExpiresAt: null,
          nextAttemptAt: new Date(Date.now() + 2 ** attempts * 15_000),
        },
      });
    }
  }
  return leased.length;
}
