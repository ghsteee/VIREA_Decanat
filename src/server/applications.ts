import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { staffInstituteIds } from "@/server/staff";

export type Field = {
  key: string;
  label: string;
  type: "text" | "number";
  required: boolean;
  max?: number;
};

export const STATUS_LABEL = {
  submitted: "подана",
  in_progress: "в работе",
  ready: "готова",
  issued: "выдана",
  rejected: "отказ",
} as const;

/** Разрешённые переходы статусов (A4). */
export const NEXT: Record<
  keyof typeof STATUS_LABEL,
  (keyof typeof STATUS_LABEL)[]
> = {
  submitted: ["in_progress", "rejected"],
  in_progress: ["ready", "rejected"],
  ready: ["issued"],
  issued: [],
  rejected: [],
};

const include = {
  type: true,
  events: { orderBy: { version: "asc" as const } },
  submissionGroup: { select: { code: true, instituteId: true } },
} as const;

/** Заявка студента: чужая → 404 (S9). studentId — только из сессии. */
export async function requireOwnApplication(studentId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const app = await db.application.findFirst({
    where: { id, studentId },
    include,
  });
  if (!app) notFound();
  return app;
}

/** Заявка для сотрудника: только из назначенных институтов, иначе 404. */
export async function requireStaffApplication(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const institutes = await staffInstituteIds(userId);
  const app = await db.application.findFirst({
    where: { id, submissionGroup: { instituteId: { in: institutes } } },
    include,
  });
  if (!app) notFound();
  return app;
}

export function num(n: number) {
  return String(n).padStart(4, "0");
}
