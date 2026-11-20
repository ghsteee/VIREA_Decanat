export type CalendarLesson = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
  version: number;
  subject: string;
  kind: string;
  location: string | null;
};

function utc(date: Date) {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

function calendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[,;]/g, "\\$&");
}

// RFC 5545 counts UTF-8 bytes. A continuation starts with one space.
function fold(line: string) {
  let bytes = 0;
  let result = "";
  for (const character of line) {
    const length = Buffer.byteLength(character);
    if (bytes + length > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += character;
    bytes += length;
  }
  return result;
}

export function lessonCalendar(lesson: CalendarLesson) {
  const fields = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dekanych//Lesson Calendar//RU",
    "BEGIN:VEVENT",
    `UID:${lesson.id}@dekanych.ru`,
    `DTSTAMP:${utc(lesson.updatedAt)}`,
    `DTSTART:${utc(lesson.startsAt)}`,
    `DTEND:${utc(lesson.endsAt)}`,
    `SEQUENCE:${lesson.version - 1}`,
    `SUMMARY:${calendarText(lesson.subject)}`,
    `DESCRIPTION:${calendarText(
      `${lesson.kind}. Актуальное расписание смотри в Деканыче.`,
    )}`,
    ...(lesson.location ? [`LOCATION:${calendarText(lesson.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return fields.map(fold).join("\r\n") + "\r\n";
}
