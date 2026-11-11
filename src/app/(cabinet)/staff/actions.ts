"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/guards";
import {
  groupRecipientUserIds,
  requireStaffGroup,
  staffInstituteIds,
} from "@/server/staff";
import { PAIRS } from "@/lib/pairs";
import { addDays, dayMonth, mskDate, mskTime, weekdayShort } from "@/lib/time";

export type FormState = { error?: string };

const at = (date: string, time: string) => new Date(`${date}T${time}:00+03:00`);

function dayLabel(date: string) {
  const today = mskDate();
  if (date === today) return "сегодня";
  if (date === addDays(today, 1)) return "завтра";
  return `${weekdayShort(date)} ${dayMonth(date)}`;
}

/** E2: перенос, отмена, смена аудитории или формата пары. */
export async function updateLesson(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireStaff();
  const lessonId = String(form.get("lessonId") ?? "");
  const version = Number(form.get("version"));
  const date = String(form.get("date") ?? "");
  const pair = Number(form.get("pair"));
  const roomId = String(form.get("roomId") ?? "");
  const format = form.get("format") === "online" ? "online" : "offline";
  const onlineUrl = String(form.get("onlineUrl") ?? "").trim();
  const cancel = form.get("cancel") === "on";
  const reason = String(form.get("reason") ?? "").trim();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { subject: true, room: { include: { campus: true } } },
  });
  if (!lesson) return { error: "Пара не найдена." };
  await requireStaffGroup(user.id, lesson.groupId);

  if (!reason || reason.length > 200)
    return { error: "Напиши причину — коротко, студенты её увидят." };
  if (!cancel) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !PAIRS[pair])
      return { error: "Выбери дату и пару." };
    if (format === "online" && !/^https:\/\/\S+$/.test(onlineUrl))
      return { error: "Для онлайн-пары нужна ссылка https://…" };
  }

  const newStartsAt = cancel ? lesson.startsAt : at(date, PAIRS[pair].start);
  const newEndsAt = cancel ? lesson.endsAt : at(date, PAIRS[pair].end);
  const newRoomId = cancel
    ? lesson.roomId
    : format === "online"
      ? null
      : roomId || lesson.roomId;
  const newRoom =
    newRoomId && newRoomId !== lesson.roomId
      ? await db.room.findUnique({
          where: { id: newRoomId },
          include: { campus: true },
        })
      : lesson.room;
  if (newRoomId && !newRoom) return { error: "Аудитория не найдена." };

  const timeChanged = newStartsAt.getTime() !== lesson.startsAt.getTime();
  const formatChanged = !cancel && format !== lesson.format;
  const roomChanged = (newRoomId ?? null) !== (lesson.roomId ?? null);
  if (!cancel && !timeChanged && !formatChanged && !roomChanged)
    return { error: "Ничего не изменилось." };

  const kind = cancel
    ? "cancelled"
    : timeChanged
      ? "moved"
      : formatChanged
        ? "format_changed"
        : "room_changed";
  const oldDate = mskDate(lesson.startsAt);
  const newDate = mskDate(newStartsAt);
  const subj = lesson.subject.shortName ?? lesson.subject.name;
  const code = (r: typeof lesson.room) =>
    r ? `${r.campus.code}-${r.number}` : "онлайн";

  const title =
    kind === "cancelled"
      ? `${subj} ${dayLabel(oldDate)} в ${mskTime(lesson.startsAt)} отменена`
      : kind === "moved"
        ? oldDate === newDate
          ? `${subj} ${dayLabel(newDate)} в ${mskTime(newStartsAt)}, а не в ${mskTime(lesson.startsAt)}`
          : `${subj} переносится: ${dayLabel(newDate)} в ${mskTime(newStartsAt)}`
        : kind === "format_changed"
          ? `${subj} ${dayLabel(newDate)} — ${format === "online" ? "онлайн" : "очно"}`
          : `${subj} ${dayLabel(newDate)}: аудитория ${code(newRoom)}`;
  const body = [
    kind === "room_changed" || kind === "moved"
      ? `Аудитория ${code(newRoom)}.`
      : "",
    reason,
  ]
    .filter(Boolean)
    .join(" ");

  const soon = [mskDate(), addDays(mskDate(), 1)];
  const urgent = soon.includes(oldDate) || soon.includes(newDate);
  const recipients = await groupRecipientUserIds([lesson.groupId]);

  try {
    await db.$transaction(async (tx) => {
      const res = await tx.lesson.updateMany({
        where: { id: lesson.id, version },
        data: {
          startsAt: newStartsAt,
          endsAt: newEndsAt,
          roomId: newRoomId,
          format: cancel ? lesson.format : format,
          onlineUrl: cancel
            ? lesson.onlineUrl
            : format === "online"
              ? onlineUrl
              : null,
          status: cancel ? "cancelled" : "scheduled",
          version: { increment: 1 },
        },
      });
      if (res.count !== 1) throw new Error("conflict");
      const change = await tx.lessonChange.create({
        data: {
          lessonId: lesson.id,
          version: version + 1,
          kind,
          authorId: user.id,
          authorRole: "staff",
          reason,
          previousStartsAt: lesson.startsAt,
          newStartsAt,
          previousEndsAt: lesson.endsAt,
          newEndsAt,
          previousFormat: lesson.format,
          newFormat: cancel ? lesson.format : format,
          previousRoomId: lesson.roomId,
          newRoomId,
          previousOnlineUrl: lesson.onlineUrl,
          newOnlineUrl: cancel
            ? lesson.onlineUrl
            : format === "online"
              ? onlineUrl
              : null,
          previousStatus: lesson.status,
          newStatus: cancel ? "cancelled" : "scheduled",
        },
      });
      // Доставка push и писем добавится в задачах 4.6 и 4.7 — из этих же получателей
      await tx.notification.create({
        data: {
          kind: "lesson_change",
          importance: urgent ? "urgent" : "normal",
          eventKey: `lesson:${lesson.id}:v${version + 1}`,
          title,
          body,
          lessonChangeId: change.id,
          recipients: { create: recipients.map((userId) => ({ userId })) },
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "conflict") {
      return { error: "Пару уже изменили. Обнови страницу и проверь ещё раз." };
    }
    throw e;
  }

  revalidatePath("/staff/schedule");
  redirect(
    `/staff/schedule?group=${lesson.groupId}&date=${cancel ? oldDate : newDate}&done=1`,
  );
}

/** E3: дедлайн или объявление для выбранных групп в пределах назначенных институтов. */
export async function publishPost(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireStaff();
  const type = form.get("type") === "deadline" ? "deadline" : "announcement";
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const due = String(form.get("dueAt") ?? "");
  const groupIds = form.getAll("groups").map(String);

  if (!title || title.length > 120)
    return { error: "Нужен заголовок до 120 символов." };
  if (type === "announcement" && !body)
    return { error: "Напиши текст объявления." };
  if (body.length > 1000) return { error: "Текст — до 1000 символов." };
  if (!groupIds.length) return { error: "Выбери хотя бы одну группу." };

  const institutes = await staffInstituteIds(user.id);
  const allowed = await db.group.findMany({
    where: { id: { in: groupIds }, instituteId: { in: institutes } },
    select: { id: true },
  });
  if (allowed.length !== new Set(groupIds).size)
    return { error: "Среди групп есть недоступные тебе." };
  const ids = allowed.map((g) => g.id);

  let dueAt: Date | null = null;
  if (type === "deadline") {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(due))
      return { error: "Укажи срок: дату и время." };
    dueAt = new Date(`${due}:00+03:00`);
    if (dueAt.getTime() <= Date.now())
      return { error: "Срок должен быть в будущем." };
  }

  const recipients = await groupRecipientUserIds(ids);
  await db.$transaction(async (tx) => {
    if (type === "deadline" && dueAt) {
      const d = await tx.deadline.create({
        data: {
          title,
          body: body || null,
          dueAt,
          authorId: user.id,
          authorRole: "staff",
          groups: { create: ids.map((groupId) => ({ groupId })) },
          reminders: {
            create: [
              {
                dueVersion: 1,
                offset: "d3" as const,
                scheduledAt: new Date(dueAt.getTime() - 3 * 86_400_000),
              },
              {
                dueVersion: 1,
                offset: "d1" as const,
                scheduledAt: new Date(dueAt.getTime() - 86_400_000),
              },
            ].filter((r) => r.scheduledAt.getTime() > Date.now()),
          },
        },
      });
      await tx.notification.create({
        data: {
          kind: "deadline",
          eventKey: `deadline:${d.id}:v1`,
          title,
          body: `До ${weekdayShort(mskDate(dueAt))} ${dayMonth(mskDate(dueAt))}, ${mskTime(dueAt)}.${body ? ` ${body}` : ""}`,
          deadlineId: d.id,
          recipients: { create: recipients.map((userId) => ({ userId })) },
        },
      });
    } else {
      const a = await tx.announcement.create({
        data: {
          title,
          body,
          authorId: user.id,
          authorRole: "staff",
          groups: { create: ids.map((groupId) => ({ groupId })) },
        },
      });
      await tx.notification.create({
        data: {
          kind: "announcement",
          eventKey: `announcement:${a.id}`,
          title,
          body,
          announcementId: a.id,
          recipients: { create: recipients.map((userId) => ({ userId })) },
        },
      });
    }
  });

  revalidatePath("/staff/announcements");
  redirect("/staff/announcements?done=1");
}
