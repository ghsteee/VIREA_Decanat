import "server-only";
import { db } from "@/server/db";
import { staffInstituteIds } from "@/server/staff";

export function demoReminderKey(id: string, version: number) {
  return `demo-deadline:${id}:v${version}`;
}

/** Только собственные действующие дедлайны в пределах назначенных институтов. */
export async function demoReminderDeadlines(authorId: string, id?: string) {
  const institutes = await staffInstituteIds(authorId);
  return db.deadline.findMany({
    where: {
      authorId,
      authorRole: "staff",
      ...(id ? { id } : {}),
      dueAt: { gt: new Date() },
      groups: {
        some: {},
        every: { group: { instituteId: { in: institutes } } },
      },
    },
    orderBy: { dueAt: "asc" },
    take: id ? 1 : 12,
    select: {
      id: true,
      title: true,
      dueAt: true,
      dueVersion: true,
      groups: { select: { groupId: true } },
      notifications: {
        where: { eventKey: { startsWith: "demo-deadline:" } },
        select: { eventKey: true },
      },
    },
  });
}
