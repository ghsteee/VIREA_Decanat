import "server-only";
import type { NotificationKind, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { decryptEmail, emailConfigured, sendEmail } from "@/server/email";
import { sendPush } from "@/server/push";
import { demoLoginEnabled } from "@/server/demo";
import { demoReminderKey } from "@/lib/notification-keys";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 60_000;
const MAX_BATCHES = 12;
const CLAIM_WINDOW_MS = 35_000;
const EMAIL_SUBJECTS: Partial<Record<NotificationKind, string>> = {
  lesson_change: "Изменилось расписание",
  deadline: "Новый срочный дедлайн",
  deadline_reminder: "Приближается дедлайн",
};

/** Задания сохраняются в той же транзакции, что событие и его получатели. */
export async function enqueueDeliveries(
  tx: Prisma.TransactionClient,
  notificationId: string,
) {
  const notification = await tx.notification.findUniqueOrThrow({
    where: { id: notificationId },
    select: {
      kind: true,
      importance: true,
      recipients: {
        select: {
          id: true,
          user: {
            select: {
              pushSubscriptions: {
                where: { revokedAt: null },
                select: { id: true },
              },
              emailSubscriptions: {
                where: { revokedAt: null, verifiedAt: { not: null } },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  const useEmail =
    emailConfigured() &&
    notification.importance === "urgent" &&
    EMAIL_SUBJECTS[notification.kind];
  const rows: Prisma.NotificationDeliveryCreateManyInput[] = [];
  for (const { id, user } of notification.recipients) {
    for (const subscription of user.pushSubscriptions) {
      rows.push({
        recipientId: id,
        channel: "webPush",
        pushSubscriptionId: subscription.id,
        destinationKey: subscription.id,
      });
    }
    if (useEmail) {
      for (const subscription of user.emailSubscriptions) {
        rows.push({
          recipientId: id,
          channel: "email",
          mode: "immediate",
          emailSubscriptionId: subscription.id,
          destinationKey: subscription.id,
        });
      }
    }
  }
  if (rows.length)
    await tx.notificationDelivery.createMany({
      data: rows,
      skipDuplicates: true,
    });
}

/** Отправка вне транзакции. При остановке процесса задания подберёт воркер. */
export function startDeliveries() {
  void processDeliveries().catch(() =>
    console.error("notification delivery failed"),
  );
}

async function deliver(id: string, leaseExpiresAt: Date) {
  const d = await db.notificationDelivery.findUnique({
    where: { id },
    include: {
      pushSubscription: true,
      emailSubscription: true,
      recipient: {
        include: {
          notification: {
            include: {
              lessonChange: {
                select: { lesson: { select: { groupId: true } } },
              },
            },
          },
          user: {
            select: {
              disabledAt: true,
              studentProfile: { select: { id: true, groupId: true } },
            },
          },
        },
      },
    },
  });
  if (
    !d ||
    d.status !== "leased" ||
    d.leaseExpiresAt?.getTime() !== leaseExpiresAt.getTime()
  )
    return;
  const { notification: n, user, userId } = d.recipient;
  const push = d.pushSubscription;
  const email = d.emailSubscription;
  const where = { id, status: "leased" as const, leaseExpiresAt };
  const update = (data: Prisma.NotificationDeliveryUpdateManyMutationInput) =>
    db.notificationDelivery.updateMany({
      where,
      data: { ...data, leaseExpiresAt: null },
    });
  const subscription = d.channel === "email" ? email : push;
  if (
    !subscription ||
    subscription.revokedAt ||
    subscription.userId !== userId ||
    user.disabledAt
  ) {
    await update({ status: "cancelled" });
    return;
  }

  const isDemoReminder = n.eventKey.startsWith("demo-deadline:");
  const student = user.studentProfile;
  if (
    n.lessonChange &&
    (!student || n.lessonChange.lesson.groupId !== student.groupId)
  ) {
    await update({ status: "cancelled" });
    return;
  }
  if (isDemoReminder) {
    const deadline =
      demoLoginEnabled() && n.deadlineId && student
        ? await db.deadline.findFirst({
            where: {
              id: n.deadlineId,
              dueAt: { gt: new Date() },
              groups: { some: { groupId: student.groupId } },
              progress: { none: { studentId: student.id } },
            },
            select: { id: true, dueVersion: true },
          })
        : null;
    if (
      !deadline ||
      n.eventKey !== demoReminderKey(deadline.id, deadline.dueVersion)
    ) {
      await update({ status: "cancelled" });
      return;
    }
  }
  if (n.deadlineId && !isDemoReminder) {
    if (!student) {
      await update({ status: "cancelled" });
      return;
    }
    const deadline = await db.deadline.findFirst({
      where: {
        id: n.deadlineId,
        dueAt: { gt: new Date() },
        groups: { some: { groupId: student.groupId } },
        progress: { none: { studentId: student.id } },
      },
      select: { dueVersion: true },
    });
    const reminder =
      n.kind === "deadline_reminder" &&
      deadline &&
      n.eventKey.startsWith("reminder:")
        ? await db.deadlineReminder.findFirst({
            where: {
              id: n.eventKey.slice("reminder:".length),
              deadlineId: n.deadlineId,
              dueVersion: deadline.dueVersion,
              status: "sent",
            },
            select: { id: true },
          })
        : null;
    if (!deadline || (n.kind === "deadline_reminder" && !reminder)) {
      await update({ status: "cancelled" });
      return;
    }
  }
  if (email) {
    const title = EMAIL_SUBJECTS[n.kind];
    if (!student || !email.verifiedAt || !title || n.importance !== "urgent") {
      await update({ status: "cancelled" });
      return;
    }
    if (!emailConfigured()) {
      await update({ status: "failed", lastErrorCode: "smtp-not-configured" });
      return;
    }
    const activeEmail = await db.emailSubscription.findFirst({
      where: {
        id: email.id,
        userId,
        revokedAt: null,
        verifiedAt: { not: null },
      },
      select: { addressEncrypted: true },
    });
    if (!activeEmail) {
      await update({ status: "cancelled" });
      return;
    }
    const address = decryptEmail(activeEmail.addressEncrypted, email.id);
    if (!address) {
      await update({
        status: "failed",
        lastErrorCode: "email-address-unavailable",
      });
      return;
    }
    const result = await sendEmail({
      to: address,
      title,
      path: n.kind === "lesson_change" ? "/schedule" : "/feed",
      deliveryId: d.id,
    });
    await update(deliveryResult(result, d.attempts));
  } else if (push) {
    const url =
      n.kind === "lesson_change"
        ? "/schedule"
        : n.kind === "application_status"
          ? "/requests"
          : "/feed";
    const result = await sendPush(push, {
      title: n.title,
      body: n.body ?? undefined,
      url,
      tag: n.eventKey,
    });
    const updated = await update(deliveryResult(result, d.attempts));
    if (result === "gone" && updated.count) {
      await db.pushSubscription.updateMany({
        where: {
          id: push.id,
          userId,
          p256dh: push.p256dh,
          auth: push.auth,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
  }
}

function deliveryResult(
  result:
    | Awaited<ReturnType<typeof sendPush>>
    | Awaited<ReturnType<typeof sendEmail>>,
  previousAttempts: number,
): Prisma.NotificationDeliveryUpdateManyMutationInput {
  const attempts = previousAttempts + 1;
  if (result === "accepted")
    return {
      status: "accepted",
      acceptedAt: new Date(),
      attempts,
      lastErrorCode: null,
    };
  if (result !== "retry")
    return { status: "failed", attempts, lastErrorCode: result };
  return {
    status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
    attempts,
    lastErrorCode: "retry",
    nextAttemptAt: new Date(Date.now() + 2 ** attempts * 15_000),
  };
}

let running = false;

/** Освобождаем очередь сразу после каждого пакета, с ограничением нагрузки. */
export async function processDeliveries(limit = 10) {
  if (running) return;
  running = true;
  const claimUntil = performance.now() + CLAIM_WINDOW_MS;
  try {
    for (
      let batch = 0;
      batch < MAX_BATCHES && performance.now() < claimUntil;
      batch++
    ) {
      const leaseExpiresAt = new Date(Date.now() + LEASE_MS);
      const leased = await db.$queryRaw<{ id: string }[]>`
        UPDATE "NotificationDelivery" SET "status" = 'leased', "leaseExpiresAt" = ${leaseExpiresAt}
        WHERE "id" IN (
          SELECT "id" FROM "NotificationDelivery"
          WHERE ("channel" = 'webPush' OR ("channel" = 'email' AND "mode" = 'immediate'))
            AND ("status" = 'pending' OR ("status" = 'leased' AND "leaseExpiresAt" < now()))
            AND "nextAttemptAt" <= now()
          ORDER BY "nextAttemptAt", "id"
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING "id"`;
      if (!leased.length) return;
      const results = await Promise.allSettled(
        leased.map(({ id }) => deliver(id, leaseExpiresAt)),
      );
      if (results.some((result) => result.status === "rejected"))
        console.error("notification delivery attempt failed");
    }
  } finally {
    running = false;
  }
}
