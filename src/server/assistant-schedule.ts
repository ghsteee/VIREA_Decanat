import "server-only";
import {
  addDays,
  dayMonth,
  isoWeekday,
  mskDate,
  mskDayStart,
  mskTime,
  weekStart,
  weekdayShort,
} from "@/lib/time";
import {
  dayRange,
  getLessons,
  getMovedOut,
  getNextLesson,
  getSessionSchedule,
  type LessonView,
} from "@/server/queries/schedule";
import { noAnswer, type PersonalAnswer } from "./assistant-personal";

const months = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const weekdays = [
  /(?:^|\P{L})(?:понедельник|пн)(?!\p{L})/u,
  /(?:^|\P{L})(?:вторник|вт)(?!\p{L})/u,
  /(?:^|\P{L})(?:сред[ау]|ср)(?!\p{L})/u,
  /(?:^|\P{L})(?:четверг|чт)(?!\p{L})/u,
  /(?:^|\P{L})(?:пятниц[ау]|пт)(?!\p{L})/u,
  /(?:^|\P{L})(?:суббот[ау]|сб)(?!\p{L})/u,
  /(?:^|\P{L})(?:воскресенье|вс)(?!\p{L})/u,
];

function validDate(date: string) {
  const start = mskDayStart(date);
  return !Number.isNaN(+start) && mskDate(start) === date ? date : null;
}

function requestedDate(question: string, today: string): string | null {
  const iso = question.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (iso) return validDate(iso[0]);
  const numeric = question.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?\b/);
  const named = question.match(/\b(\d{1,2})\s+(\p{L}+)(?:\s+(\d{4})\b)?/u);
  const month = named ? months.indexOf(named[2]) + 1 : 0;
  const dateParts = numeric ?? (month ? named : null);
  if (dateParts) {
    const [, day, monthName, year = today.slice(0, 4)] = dateParts;
    const monthNumber = numeric ? monthName : String(month);
    return validDate(
      `${year}-${monthNumber.padStart(2, "0")}-${day.padStart(2, "0")}`,
    );
  }

  if (/послезавтра/u.test(question)) return addDays(today, 2);
  if (/завтра/u.test(question)) return addDays(today, 1);
  if (/позавчера/u.test(question)) return addDays(today, -2);
  if (/вчера/u.test(question)) return addDays(today, -1);
  const weekday = weekdays.findIndex((pattern) => pattern.test(question));
  if (weekday === -1) return today;
  if (/следующ\p{L}*\s+недел/u.test(question)) {
    return addDays(weekStart(today), weekday + 7);
  }
  if (/прошл\p{L}*\s+недел/u.test(question)) {
    return addDays(weekStart(today), weekday - 7);
  }
  if (/(?:этой|эту|текущей|текущую)\s+недел/u.test(question)) {
    return addDays(weekStart(today), weekday);
  }
  return addDays(today, (weekday + 8 - isoWeekday(today)) % 7);
}

function lessonText(lesson: LessonView) {
  const label = `${lesson.start}–${lesson.end} — ${lesson.subject}`;
  if (lesson.state.kind === "cancelled") return `${label} · отменена`;
  const room = lesson.roomLabel
    ? `аудитория ${lesson.roomLabel}`
    : lesson.roomFlaps === "ОНЛ"
      ? "онлайн"
      : "аудитория уточняется";
  return `${label} · ${room}`;
}

function scheduleLink(date: string, additional = "") {
  return {
    href: `/schedule?date=${date}${additional}`,
    label: "Открыть расписание",
  };
}

async function answerSession(
  question: string,
  groupId: string,
  now: Date,
): Promise<PersonalAnswer> {
  const { term, exams } = await getSessionSchedule(groupId, now);
  const link = {
    href: "/schedule?view=session",
    label: "Открыть расписание сессии",
  };
  if (/нач(?:н[её]тся|инается|ало)\s+сесси/u.test(question)) {
    return term?.sessionStartsOn
      ? {
          message: `Сессия начинается ${dayMonth(mskDate(term.sessionStartsOn))}.`,
          link,
        }
      : { message: noAnswer, link };
  }
  const kind =
    /экзамен/u.test(question) && !/зач[её]т/u.test(question)
      ? "exam"
      : /зач[её]т/u.test(question) && !/экзамен/u.test(question)
        ? "credit"
        : null;
  const entries = kind ? exams.filter((exam) => exam.kind === kind) : exams;
  if (!entries.length) return { message: noAnswer, link };

  return {
    message: entries
      .map((exam) => {
        const date = exam.heldOn
          ? dayMonth(mskDate(exam.heldOn))
          : "дата уточняется";
        const time = exam.sessionStartsAt
          ? ` в ${mskTime(exam.sessionStartsAt)}`
          : "";
        const room = exam.sessionRoom ? ` · аудитория ${exam.sessionRoom}` : "";
        return `${exam.subject.name} · ${exam.kind === "exam" ? "экзамен" : "зачёт"} · ${date}${time}${room}`;
      })
      .join("\n"),
    link,
  };
}

export async function answerSchedule(
  question: string,
  groupId: string,
  now = new Date(),
): Promise<PersonalAnswer> {
  const normalized = question.toLocaleLowerCase("ru-RU");
  const today = mskDate(now);
  if (/сесси|экзамен|зач[её]т/u.test(normalized)) {
    return answerSession(normalized, groupId, now);
  }

  const next = /следующ\p{L}*\s+(?:пар|заняти)/u.test(normalized);
  const nearest = /ближайш\p{L}*\s+(?:пар|заняти)/u.test(normalized);
  if (next || nearest) {
    const lesson = await getNextLesson(groupId, now, nearest);
    if (!lesson) return { message: noAnswer, link: scheduleLink(today) };
    const date = mskDate(lesson.startsAt);
    return {
      message: `${next ? "Следующая" : "Ближайшая"} пара ${dayMonth(date)}\n${lessonText(lesson)}`,
      link: scheduleLink(date, `#lesson-${lesson.id}`),
    };
  }

  const date = requestedDate(normalized, today);
  if (!date) return { message: noAnswer };
  const week =
    /недел/u.test(normalized) && !weekdays.some((day) => day.test(normalized));
  const weekOffset = /следующ\p{L}*\s+недел/u.test(normalized)
    ? 7
    : /прошл\p{L}*\s+недел/u.test(normalized)
      ? -7
      : 0;
  const start = week ? addDays(weekStart(date), weekOffset) : date;
  const [from, to] = week
    ? [mskDayStart(start), mskDayStart(addDays(start, 7))]
    : dayRange(date);
  const link = scheduleLink(start, week ? "&view=week" : "");
  const [lessons, moved] = await Promise.all([
    getLessons(groupId, from, to, now),
    getMovedOut(groupId, from, to),
  ]);
  if (!lessons.length && !moved.length) return { message: noAnswer, link };
  const period = week
    ? `${dayMonth(start)}–${dayMonth(addDays(start, 6))}`
    : dayMonth(date);
  const active = lessons.filter(({ state }) => state.kind !== "cancelled");
  if (/сколько\s+(?:у\s+меня\s+)?(?:пар|занятий)/u.test(normalized)) {
    return {
      message: `Количество занятий на ${period} — ${active.length}.`,
      link,
    };
  }
  const first = /перв\p{L}*\s+(?:пар|заняти)/u.test(normalized);
  const last = /последн\p{L}*\s+(?:пар|заняти)/u.test(normalized);
  if (first || last) {
    const lesson = first ? active[0] : active.at(-1);
    return lesson
      ? {
          message: `${dayMonth(mskDate(lesson.startsAt))}, ${lessonText(lesson)}`,
          link,
        }
      : { message: noAnswer, link };
  }
  const lines = lessons.map((lesson) => {
    const day = mskDate(lesson.startsAt);
    return week
      ? `${weekdayShort(day)} ${dayMonth(day)}, ${lessonText(lesson)}`
      : lessonText(lesson);
  });
  const moves = moved.map(
    (move) => `${move.subject} · перенесена с ${move.from} на ${move.to}`,
  );
  return {
    message: [`Расписание на ${period}`, ...lines, ...moves].join("\n"),
    link,
  };
}
