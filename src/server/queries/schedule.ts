import "server-only";
import { db } from "@/server/db";
import { mskDate, mskDayStart, mskTime } from "@/lib/time";
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
  const prevRooms = prevRoomIds.length
    ? await db.room.findMany({
        where: { id: { in: prevRoomIds } },
        include: { campus: true },
      })
    : [];
  const prevRoomById = new Map(prevRooms.map((r) => [r.id, roomCode(r)]));

  return rows.map((l): LessonView => {
    const ch = l.changes[0] ?? null;
    const code = roomCode(l.room);
    let state: LessonState = { kind: "planned" };
    const mins = Math.round((l.startsAt.getTime() - now.getTime()) / 60000);

    if (l.status === "cancelled") state = { kind: "cancelled" };
    else if (l.endsAt <= now) state = { kind: "past" };
    else if (l.startsAt <= now) state = { kind: "now" };
    else if (ch && ch.previousStartsAt.getTime() !== ch.newStartsAt.getTime())
      state = { kind: "moved", from: mskTime(ch.previousStartsAt) };
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
  const changes = await db.lessonChange.findMany({
    where: { lesson: { groupId }, newStartsAt: { gte: from, lt: to } },
    select: { newStartsAt: true },
  });
  return new Set(changes.map((c) => mskDate(c.newStartsAt)));
}
