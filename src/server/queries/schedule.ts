import "server-only";
import { db } from "@/server/db";
import type { CalendarLesson } from "@/server/lesson-calendar";
import { dayMonth, mskDate, mskDayStart, mskTime } from "@/lib/time";
import type { LessonState } from "@/components/board/status";

export type LessonView = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  start: string;
  end: string;
  subject: string;
  subjectShort: string;
  kind: "lecture" | "practice" | "lab";
  teachers: string[];
  /** Код для плиток: «А214», «ЗАЛ», «ОНЛ» */
  roomFlaps: string;
  /** «А-214» */
  roomLabel: string | null;
  room: {
    campus: string;
    address: string;
    floor: number | null;
    mapUrl: string | null;
  } | null;
  onlineUrl: string | null;
  state: LessonState;
  changed: boolean;
  move: { from: string; to: string } | null;
  change: { at: Date; reason: string | null; byStaff: boolean } | null;
};

const KIND = { lecture: "лекция", practice: "практика", lab: "лаба" } as const;
export const kindLabel = (k: LessonView["kind"]) => KIND[k];

/** «Ясноборов И. А.» */
function shortName(full: string): string {
  const [last, first, middle] = full.split(" ");
  return [last, first ? `${first[0]}.` : "", middle ? `${middle[0]}.` : ""]
    .filter(Boolean)
    .join(" ");
}

function roomCode(room: { number: string; campus: { code: string } } | null) {
  if (!room) return null;
  return room.number === "Спортзал"
    ? "Спортзал"
    : `${room.campus.code}-${room.number}`;
}

const lessonInclude = {
  subject: true,
  room: { include: { campus: true } },
  teachers: { include: { teacher: true } },
  changes: { orderBy: { version: "desc" as const }, take: 1 },
};

/**
 * Пары группы в интервале [from, to). groupId берётся только из сессии.
 */
export async function getLessons(
  groupId: string,
  from: Date,
  to: Date,
  now = new Date(),
) {
  const rows = await db.lesson.findMany({
    where: { groupId, startsAt: { gte: from, lt: to } },
    include: lessonInclude,
    orderBy: { startsAt: "asc" },
  });

  const prevRoomIds = rows.flatMap((l) =>
    l.changes[0]?.previousRoomId ? [l.changes[0].previousRoomId] : [],
  );
  const [prevRooms, moves] = await Promise.all([
    prevRoomIds.length
      ? db.room.findMany({
          where: { id: { in: prevRoomIds } },
          include: { campus: true },
        })
      : [],
    rows.length
      ? db.lessonChange.findMany({
          where: {
            lessonId: { in: rows.map((lesson) => lesson.id) },
            kind: "moved",
          },
          orderBy: { version: "desc" },
          distinct: ["lessonId"],
          select: { lessonId: true, previousStartsAt: true },
        })
      : [],
  ]);
  const moveByLesson = new Map(
    moves.map((move) => [move.lessonId, move.previousStartsAt]),
  );
  const prevRoomById = new Map(prevRooms.map((r) => [r.id, roomCode(r)]));

  return rows.map((l): LessonView => {
    const ch = l.changes[0] ?? null;
    const code = roomCode(l.room);
    const from = moveByLesson.get(l.id);
    const move = from
      ? { from: slotLabel(from), to: slotLabel(l.startsAt) }
      : null;
    let state: LessonState = { kind: "planned" };
    const mins = Math.round((l.startsAt.getTime() - now.getTime()) / 60000);

    if (l.status === "cancelled") state = { kind: "cancelled" };
    else if (l.endsAt <= now) state = { kind: "past" };
    else if (l.startsAt <= now) state = { kind: "now" };
    else if (ch && ch.previousStartsAt.getTime() !== ch.newStartsAt.getTime())
      state = {
        kind: "moved",
        from: slotLabel(ch.previousStartsAt),
        to: slotLabel(l.startsAt),
      };
    else if (ch && ch.newFormat === "online" && ch.previousFormat !== "online")
      state = {
        kind: "online",
        from: ch.previousRoomId
          ? (prevRoomById.get(ch.previousRoomId) ?? undefined)
          : undefined,
      };
    else if (ch && ch.previousRoomId !== ch.newRoomId && ch.previousRoomId)
      state = { kind: "room", from: prevRoomById.get(ch.previousRoomId) ?? "" };
    else if (mins <= 60) state = { kind: "soon", minutes: mins };

    return {
      id: l.id,
      startsAt: l.startsAt,
      endsAt: l.endsAt,
      start: mskTime(l.startsAt),
      end: mskTime(l.endsAt),
      subject: l.subject.name,
      subjectShort: l.subject.shortName ?? l.subject.name,
      kind: l.kind,
      teachers: l.teachers.map((t) => shortName(t.teacher.fullName)),
      roomFlaps:
        l.format === "online"
          ? "ОНЛ"
          : code === "Спортзал"
            ? "ЗАЛ"
            : (code ?? "—").replace("-", ""),
      roomLabel: l.format === "online" ? null : code,
      room: l.room
        ? {
            campus: l.room.campus.name,
            address: l.room.campus.address,
            floor: l.room.floor,
            mapUrl: l.room.campus.mapUrl,
          }
        : null,
      onlineUrl: l.onlineUrl,
      state,
      changed: Boolean(ch),
      move,
      change: ch
        ? {
            at: ch.publishedAt,
            reason: ch.reason,
            byStaff: ch.authorRole === "staff",
          }
        : null,
    };
  });
}

/** Актуальные реквизиты будущей или текущей пары только для группы студента. */
export async function getCalendarLesson(
  groupId: string,
  lessonId: string,
  now = new Date(),
): Promise<CalendarLesson | null> {
  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      groupId,
      status: "scheduled",
      endsAt: { gt: now },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      version: true,
      kind: true,
      format: true,
      subject: { select: { name: true } },
      room: {
        select: {
          number: true,
          campus: { select: { code: true, address: true } },
        },
      },
      changes: {
        orderBy: { version: "desc" },
        take: 1,
        select: { publishedAt: true },
      },
    },
  });
  if (!lesson) return null;
  const room = roomCode(lesson.room);
  return {
    id: lesson.id,
    startsAt: lesson.startsAt,
    endsAt: lesson.endsAt,
    updatedAt: lesson.changes[0]?.publishedAt ?? now,
    version: lesson.version,
    subject: lesson.subject.name,
    kind: kindLabel(lesson.kind),
    location:
      lesson.format === "online"
        ? "Онлайн"
        : lesson.room && room
          ? `${room}, ${lesson.room.campus.address}`
          : null,
  };
}

export function slotLabel(date: Date): string {
  return `${dayMonth(mskDate(date))} ${mskTime(date)}`;
}

/** На исходной дате оставляем ссылку на текущее место перенесённой пары. */
export async function getMovedOut(groupId: string, from: Date, to: Date) {
  const rows = await db.lessonChange.findMany({
    where: {
      kind: "moved",
      previousStartsAt: { gte: from, lt: to },
      lesson: { groupId },
    },
    orderBy: { version: "desc" },
    select: {
      lessonId: true,
      previousStartsAt: true,
      lesson: {
        select: { startsAt: true, subject: { select: { name: true } } },
      },
    },
  });
  const seen = new Set<string>();
  return rows.flatMap(({ lessonId, previousStartsAt, lesson }) => {
    const date = mskDate(previousStartsAt);
    const toDate = mskDate(lesson.startsAt);
    const key = `${date}:${lessonId}`;
    if (date === toDate || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        key,
        lessonId,
        date,
        toDate,
        subject: lesson.subject.name,
        from: slotLabel(previousStartsAt),
        to: slotLabel(lesson.startsAt),
      },
    ];
  });
}

export function dayRange(date: string): [Date, Date] {
  const from = mskDayStart(date);
  return [from, new Date(from.getTime() + 86_400_000)];
}

/** Номер учебной недели и её чётность. */
export async function getAcademicWeek(date: string) {
  const day = mskDayStart(date);
  const week = await db.academicWeek.findFirst({
    where: { startsOn: { lte: day } },
    orderBy: { startsOn: "desc" },
  });
  if (!week || day.getTime() - week.startsOn.getTime() > 7 * 86_400_000)
    return null;
  return { number: week.number, odd: week.number % 2 === 1 };
}

/** Дни недели, в которых у группы есть изменения (розовая точка на вкладке дня). */
export async function getChangedDays(groupId: string, from: Date, to: Date) {
  const range = { gte: from, lt: to };
  const changes = await db.lessonChange.findMany({
    where: {
      lesson: { groupId },
      OR: [{ previousStartsAt: range }, { newStartsAt: range }],
    },
    select: { previousStartsAt: true, newStartsAt: true },
  });
  return new Set(
    changes
      .flatMap((change) => [change.previousStartsAt, change.newStartsAt])
      .filter((date) => date >= from && date < to)
      .map(mskDate),
  );
}
