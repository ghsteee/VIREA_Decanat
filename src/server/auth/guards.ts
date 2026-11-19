import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/server/auth/session";

/** Для страниц кабинета: без сессии — на вход. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Раздел сотрудника: студенту отвечаем 404, а не 403 (правило 3 AGENTS.md). */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "staff") notFound();
  return user;
}

/** Староста публикует только в группе, закреплённой за его профилем. */
export async function requireGroupHead() {
  const user = await requireUser();
  if (user.role !== "student" || !user.isGroupHead || !user.groupId) notFound();
  return { id: user.id, groupId: user.groupId, role: "group_head" as const };
}
