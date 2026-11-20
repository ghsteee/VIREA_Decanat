import assert from "node:assert/strict";
import test from "node:test";
import { lessonCalendar } from "../../src/server/lesson-calendar";

test("пара сохраняется в UTC с номером правки и русским текстом", () => {
  const file = lessonCalendar({
    id: "aa422818-c477-4de9-81d1-c7f461072f90",
    startsAt: new Date("2026-11-20T12:20:00+03:00"),
    endsAt: new Date("2026-11-20T13:50:00+03:00"),
    updatedAt: new Date("2026-11-19T12:00:00+03:00"),
    version: 4,
    subject: "Прикладная математика ".repeat(7).trim(),
    kind: "практика",
    location: "А-214, Корпус А; этаж 2",
  });
  assert.ok(file.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  const unfolded = file.replaceAll("\r\n ", "");
  assert.match(unfolded, /DTSTAMP:20261119T090000Z\r\n/);
  assert.match(unfolded, /DTSTART:20261120T092000Z\r\n/);
  assert.match(unfolded, /DTEND:20261120T105000Z\r\n/);
  assert.match(unfolded, /SEQUENCE:3\r\n/);
  assert.ok(unfolded.includes("LOCATION:А-214\\, Корпус А\\; этаж 2\r\n"));
  assert.ok(
    unfolded.includes("SUMMARY:" + "Прикладная математика ".repeat(7).trim()),
  );
});

test("перевод строки в названии остаётся частью названия", () => {
  const date = new Date("2026-11-20T12:20:00Z");
  const file = lessonCalendar({
    id: "aa422818-c477-4de9-81d1-c7f461072f90",
    startsAt: date,
    endsAt: new Date("2026-11-20T13:50:00Z"),
    updatedAt: date,
    version: 1,
    subject: "Длинное\r\nназвание\\дисциплины",
    kind: "лекция",
    location: null,
  });
  assert.ok(
    file
      .replaceAll("\r\n ", "")
      .includes("SUMMARY:Длинное\\nназвание\\\\дисциплины\r\n"),
  );
  assert.doesNotMatch(file, /\r\nLOCATION:/);
});
