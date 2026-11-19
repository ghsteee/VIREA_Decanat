"use server";

import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/server/auth/guards";
import { db } from "@/server/db";
import { demoLoginEnabled } from "@/server/demo";
import { demoReminderDeadlines, demoReminderKey } from "@/server/demo-reminder";
import { enqueueDeliveries, startDeliveries } from "@/server/delivery";
import { dayMonth, mskDate, mskTime } from "@/lib/time";

export async function sendDemoReminder(form: FormData) {
  const user = await requireStaff();
  if (!demoLoginEnabled()) notFound();
  const id = form.get("deadlineId");
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  const [deadline] = await demoReminderDeadlines(user.id, id);
  if (!deadline) notFound();
  const eventKey = demoReminderKey(deadline.id, deadline.dueVersion);

  const result = await db.$transaction(async (tx) => {
    const groupIds = deadline.groups.map((group) => group.groupId);
    const recipients = await tx.studentProfile.findMany({
      where: {
        groupId: { in: groupIds },
        user: { disabledAt: null },
        deadlineProgress: { none: { deadlineId: id } },
      },
      select: { userId: true },
    });
    if (!recipients.length) return "none";
    const [notification] = await tx.notification.createManyAndReturn({
      data: [
        {
          kind: "deadline_reminder",
          importance: "urgent",
          eventKey,
          title: `Напоминание: ${deadline.title}`,
          body: `Демо-напоминание. Срок ${dayMonth(mskDate(deadline.dueAt))}, ${mskTime(deadline.dueAt)}.`,
          deadlineId: id,
        },
      ],
      skipDuplicates: true,
      select: { id: true },
    });
    if (!notification) return "same";
    await tx.notificationRecipient.createMany({
      data: recipients.map(({ userId }) => ({
        userId,
        notificationId: notification.id,
      })),
    });
    await enqueueDeliveries(tx, notification.id);
    return "sent";
  });

  if (result === "sent") startDeliveries();
  redirect(`/staff/announcements?reminder=${result}`);
}
