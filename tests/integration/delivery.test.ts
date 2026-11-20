import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { db } from "../../src/server/db";
import { processDeliveries } from "../../src/server/delivery";

if (process.env.INTEGRATION_TEST_DATABASE !== "on")
  throw new Error(
    "Нужна отдельная тестовая база и INTEGRATION_TEST_DATABASE=on",
  );
// В этом процессе все проверки выполняются без внешней доставки.
for (const key of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "SMTP_HOST"])
  delete process.env[key];

after(() => db.$disconnect());

test("D2: очередь отменяет просроченный, выполненный, чужой и устаревший push", async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { login: "d.severov" },
    include: { studentProfile: true },
  });
  const student = user.studentProfile!;
  const other = await db.group.findFirstOrThrow({
    where: { id: { not: student.groupId } },
  });
  const subscription = await db.pushSubscription.create({
    data: {
      userId: user.id,
      endpoint: "https://invalid.example.test/push",
      endpointHash: randomUUID(),
      p256dh: "invalid",
      auth: "invalid",
    },
  });
  try {
    for (const scenario of ["done", "expired", "foreign", "version"] as const) {
      const deadline = await db.deadline.create({
        data: {
          title: "Тест отмены доставки",
          authorId: user.id,
          authorRole: "staff",
          dueAt: new Date(
            Date.now() + (scenario === "expired" ? -1 : 1) * 86_400_000,
          ),
          dueVersion: scenario === "version" ? 2 : 1,
          groups: {
            create: {
              groupId: scenario === "foreign" ? other.id : student.groupId,
            },
          },
          ...(scenario === "done"
            ? {
                progress: {
                  create: { studentId: student.id, completedAt: new Date() },
                },
              }
            : {}),
        },
      });
      try {
        const reminder = await db.deadlineReminder.create({
          data: {
            deadlineId: deadline.id,
            dueVersion: 1,
            offset: "d1",
            status: "sent",
            scheduledAt: new Date(),
          },
        });
        const notification = await db.notification.create({
          data: {
            kind: "deadline_reminder",
            importance: "urgent",
            title: "Тестовое напоминание",
            deadlineId: deadline.id,
            eventKey: `reminder:${reminder.id}`,
            recipients: {
              create: {
                userId: user.id,
                deliveries: {
                  create: {
                    channel: "webPush",
                    pushSubscriptionId: subscription.id,
                    destinationKey: subscription.id,
                  },
                },
              },
            },
          },
        });
        await processDeliveries();
        const delivery = await db.notificationDelivery.findFirstOrThrow({
          where: { recipient: { notificationId: notification.id } },
        });
        assert.equal(delivery.status, "cancelled", scenario);
        assert.equal(delivery.attempts, 0, scenario);
      } finally {
        await db.deadline.delete({ where: { id: deadline.id } });
      }
    }
  } finally {
    await db.pushSubscription.delete({ where: { id: subscription.id } });
  }
});

test("N3: за один вызов обработаны несколько пакетов и отменено чужое назначение", async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { login: "d.severov" },
  });
  const other = await db.user.findUniqueOrThrow({
    where: { login: "k.lavrova" },
  });
  const subscription = await db.pushSubscription.create({
    data: {
      userId: other.id,
      endpoint: "https://invalid.example.test/push",
      endpointHash: randomUUID(),
      p256dh: "invalid",
      auth: "invalid",
    },
  });
  const ids: string[] = [];
  const announcement = await db.announcement.create({
    data: {
      title: "Тест очереди",
      body: "Демо",
      authorId: user.id,
      authorRole: "staff",
    },
  });
  try {
    for (let index = 0; index < 25; index++) {
      const notification = await db.notification.create({
        data: {
          kind: "announcement",
          announcementId: announcement.id,
          title: "Тест очереди",
          eventKey: `test:${randomUUID()}`,
          recipients: {
            create: {
              userId: user.id,
              deliveries: {
                create: {
                  channel: "webPush",
                  pushSubscriptionId: subscription.id,
                  destinationKey: subscription.id,
                },
              },
            },
          },
        },
      });
      ids.push(notification.id);
    }
    await processDeliveries(10);
    const deliveries = await db.notificationDelivery.findMany({
      where: { recipient: { notificationId: { in: ids } } },
    });
    assert.equal(deliveries.length, 25);
    assert.ok(
      deliveries.every(
        (delivery) =>
          delivery.status === "cancelled" && delivery.attempts === 0,
      ),
    );
  } finally {
    await db.notification.deleteMany({ where: { id: { in: ids } } });
    await db.announcement.delete({ where: { id: announcement.id } });
    await db.pushSubscription.delete({ where: { id: subscription.id } });
  }
});
