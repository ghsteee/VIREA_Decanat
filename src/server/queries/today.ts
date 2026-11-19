import "server-only";
import { db } from "@/server/db";

const ACTIVE = ["submitted", "in_progress", "ready"] as const;

/** Дедлайны группы на ближайшие 7 дней с отметкой «сделано» текущего студента. */
export async function getWeekDeadlines(
  groupId: string,
  studentId: string,
  now = new Date(),
) {
  const rows = await db.deadline.findMany({
    where: {
      groups: { some: { groupId } },
      dueAt: { gte: now, lt: new Date(now.getTime() + 7 * 86_400_000) },
    },
    include: {
      subject: true,
      progress: { where: { studentId }, select: { completedAt: true } },
    },
    orderBy: { dueAt: "asc" },
  });
  return rows.map((d) => ({
    id: d.id,
    title: d.title,
    dueAt: d.dueAt,
    fromHead: d.authorRole === "group_head",
    done: d.progress.length > 0,
  }));
}

/** Самая важная активная заявка: сначала готовые к выдаче. */
export async function getTopApplication(studentId: string) {
  const apps = await db.application.findMany({
    where: { studentId, status: { in: [...ACTIVE] } },
    include: { type: true, events: { orderBy: { version: "asc" } } },
    orderBy: { submittedAt: "desc" },
  });
  apps.sort(
    (a, b) => Number(b.status === "ready") - Number(a.status === "ready"),
  );
  return apps[0] ?? null;
}

export async function getUnreadCount(userId: string) {
  return db.notificationRecipient.count({ where: { userId, readAt: null } });
}

export function getTodayChanges(groupId: string, from: Date, to: Date) {
  const range = { gte: from, lt: to };
  return db.lessonChange.findMany({
    where: {
      lesson: { groupId },
      OR: [{ previousStartsAt: range }, { newStartsAt: range }],
    },
    select: {
      id: true,
      lessonId: true,
      kind: true,
      authorRole: true,
      reason: true,
      previousStartsAt: true,
      newStartsAt: true,
      lesson: { select: { subject: { select: { name: true } } } },
    },
    orderBy: [{ publishedAt: "desc" }, { version: "desc" }],
  });
}

export function getNewResults(studentId: string, now: Date) {
  return db.assessmentResult.findMany({
    where: {
      studentId,
      publishedAt: { gte: new Date(now.getTime() - 7 * 86_400_000), lte: now },
    },
    select: {
      id: true,
      scale: true,
      value: true,
      passed: true,
      assessment: {
        select: { title: true, subject: { select: { name: true } } },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: 3,
  });
}
