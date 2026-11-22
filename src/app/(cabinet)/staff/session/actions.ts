"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth/guards";
import { requireStaffGroup } from "@/server/staff";
import { db } from "@/server/db";
import { mskDate } from "@/lib/time";
import { sessionSubjects } from "@/server/queries/session-editor";

export type SessionState = {
  error?: string;
  savedId?: string;
  version?: number;
};
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function saveSession(
  _previous: SessionState,
  form: FormData,
): Promise<SessionState> {
  const user = await requireStaff();
  const value = (name: string) => String(form.get(name) ?? "").trim();
  const groupId = value("groupId");
  const subjectId = value("subjectId");
  const termId = value("termId");
  const id = value("assessmentId");
  if (
    ![groupId, subjectId, termId].every((v) => UUID.test(v)) ||
    (id && !UUID.test(id))
  )
    notFound();
  await requireStaffGroup(user.id, groupId);
  const term = await db.academicTerm.findUnique({ where: { id: termId } });
  const course = (await sessionSubjects(groupId, termId)).find(
    (s) => s.id === subjectId,
  );
  if (!term || !course) notFound();
  const current = id ? course.assessments.find((a) => a.id === id) : null;
  if (id && !current) notFound();
  const kind = value("kind");
  if (kind !== "exam" && kind !== "credit")
    return { error: "Выбери экзамен или зачёт." };
  const date = value("date");
  const time = value("time");
  const room = value("room");
  if (room.length > 80)
    return { error: "Название аудитории — до 80 символов." };
  let heldOn: Date | null = null;
  let sessionStartsAt: Date | null = null;
  if (date) {
    heldOn = new Date(`${date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(heldOn.getTime()) ||
      heldOn.toISOString().slice(0, 10) !== date
    )
      return { error: "Выбери существующую дату." };
    if (date < mskDate(term.startsOn) || date > mskDate(term.endsOn))
      return { error: "Дата должна находиться в выбранном семестре." };
  }
  if (time) {
    if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      return { error: "Для времени укажи дату и корректное время начала." };
    sessionStartsAt = new Date(`${date}T${time}:00+03:00`);
  }
  if (
    current &&
    current.kind !== kind &&
    (await db.assessmentResult.count({ where: { assessmentId: current.id } }))
  )
    return {
      error:
        "По этой аттестации уже есть результаты. Форму контроля менять нельзя.",
    };
  const expectedVersion = Number(value("version"));
  if (current && (!Number.isInteger(expectedVersion) || expectedVersion < 1))
    return { error: "Обнови страницу и повтори сохранение." };
  const data = {
    kind,
    title:
      current?.kind === kind
        ? current.title
        : kind === "exam"
          ? "Экзамен"
          : "Зачёт",
    heldOn,
    sessionStartsAt,
    sessionRoom: room || null,
  } as const;
  const result = await db.$transaction(async (tx) => {
    // Сериализация публикаций одной группы предотвращает дубли при двух открытых формах.
    await tx.$queryRaw`SELECT id FROM "Group" WHERE id = ${groupId}::uuid FOR UPDATE`;
    if (
      sessionStartsAt &&
      (await tx.assessment.findFirst({
        where: {
          groupId,
          termId,
          kind: { in: ["exam", "credit"] },
          sessionStartsAt,
          ...(id ? { id: { not: id } } : {}),
        },
      }))
    )
      return {
        error: "На это время у группы уже назначена другая аттестация.",
      };
    if (current) {
      const updated = await tx.assessment.updateMany({
        where: {
          id: current.id,
          groupId,
          termId,
          subjectId,
          sessionVersion: expectedVersion,
        },
        data: { ...data, sessionVersion: { increment: 1 } },
      });
      if (!updated.count)
        return {
          error: "Расписание уже изменили. Обнови страницу и проверь данные.",
        };
      return { savedId: current.id, version: expectedVersion + 1 };
    }
    if (
      await tx.assessment.findFirst({
        where: { groupId, termId, subjectId, kind: { in: ["exam", "credit"] } },
      })
    )
      return {
        error:
          "Форма контроля уже назначена. Обнови страницу для редактирования.",
      };
    const created = await tx.assessment.create({
      data: { ...data, groupId, termId, subjectId },
    });
    return { savedId: created.id, version: created.sessionVersion };
  });
  if (result.savedId) {
    revalidatePath("/staff/session");
    revalidatePath("/study");
    revalidatePath("/schedule");
  }
  return result;
}
