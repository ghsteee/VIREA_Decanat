import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/server/db";

/** Институты, назначенные сотруднику. Только из сессии, не из запроса. */
export async function staffInstituteIds(userId: string): Promise<string[]> {
  const rows = await db.staffInstitute.findMany({
    where: { userId },
    select: { instituteId: true },
  });
  return rows.map((r) => r.instituteId);
}

/** Группы, с которыми сотрудник может работать. */
export async function staffGroups(userId: string) {
  const institutes = await staffInstituteIds(userId);
  return db.group.findMany({
    where: { instituteId: { in: institutes } },
    include: { institute: { select: { code: true } } },
    orderBy: [{ institute: { code: "asc" } }, { code: "asc" }],
  });
}

/** Группа вне назначенных институтов → 404 (правило 3 AGENTS.md). */
export async function requireStaffGroup(userId: string, groupId: string) {
  const institutes = await staffInstituteIds(userId);
  const group = await db.group.findFirst({
    where: { id: groupId, instituteId: { in: institutes } },
    include: { institute: true },
  });
  if (!group) notFound();
  return group;
}

/** Получатели публикации для группы — все студенты группы с аккаунтом. */
export async function groupRecipientUserIds(groupIds: string[]) {
  const rows = await db.studentProfile.findMany({
    where: { groupId: { in: groupIds }, user: { disabledAt: null } },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
