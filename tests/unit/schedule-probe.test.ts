import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const teacher = "Макетольцев Проект Фиктивович";
const event = [
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Moscow:20261102T091500",
  "DTEND;TZID=Europe/Moscow:20261102T104500",
  "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T120000Z",
  "X-META-DISCIPLINE:Учебная дисциплина",
  "X-META-LESSON_TYPE:ПР",
  "X-META-AUDITORIUM;CAMPUS=ДЕМО;NUMBER=105:",
  `X-META-TEACHER:${teacher}`,
  `X-META-TEACHER:${teacher.toLowerCase().replaceAll(" ", "  ")}`,
  "END:VEVENT",
].join("\r\n");

function probe(events: string, monday = "2026-11-16") {
  const calendar = ["BEGIN:VCALENDAR", events, "END:VCALENDAR\r\n"].join(
    "\r\n",
  );
  const bootstrap = `
    globalThis.fetch = async function (url, { credentials, redirect }) {
      if (url.origin !== "https://schedule-of.mirea.ru" ||
          credentials !== "omit" || redirect !== "error") throw new Error("Unexpected request");
      if (url.pathname === "/schedule/api/search") {
        if (url.searchParams.get("match") !== "ДЕМО-01-26") throw new Error("Unexpected group");
        return Response.json({ data: [{
          scheduleTarget: 1, targetTitle: "ДЕМО-01-26",
          iCalLink: "/schedule/api/ical/1/100", id: 100,
        }] });
      }
      if (url.pathname === "/schedule/api/ical/1/100" && url.searchParams.get("includeMeta") === "true") {
        return new Response(${JSON.stringify(calendar)}, { headers: { "content-type": "text/calendar" } });
      }
      throw new Error("Unexpected URL");
    };
  `;
  return spawnSync(
    process.execPath,
    [
      "--import",
      `data:text/javascript,${encodeURIComponent(bootstrap)}`,
      "scripts/schedule/probe.mjs",
      "ДЕМО-01-26",
      monday,
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
}

test("проба учитывает чередование, московское время и замену преподавателя", () => {
  const result = probe(event);
  assert.equal(result.status, 0, result.stderr);
  const cards = JSON.parse(result.stdout);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].date, "2026-11-16");
  assert.equal(cards[0].startTime, "09:15");
  assert.equal(cards[0].endTime, "10:45");
  assert.equal(cards[0].teachers.length, 1);
  assert.ok(!result.stdout.includes(teacher));

  const excluded = probe(
    event.replace(
      "END:VEVENT",
      "EXDATE;TZID=Europe/Moscow:20261116T091500\r\nEND:VEVENT",
    ),
  );
  assert.equal(excluded.status, 0, excluded.stderr);
  assert.deepEqual(JSON.parse(excluded.stdout), []);
});

test("отмена отдельного занятия серии требует ручной проверки", () => {
  const cancellation = [
    "BEGIN:VEVENT",
    "UID:series",
    "RECURRENCE-ID;TZID=Europe/Moscow:20261116T091500",
    "STATUS:CANCELLED",
    "END:VEVENT",
  ].join("\r\n");
  const result = probe(
    event.replace("BEGIN:VEVENT", "BEGIN:VEVENT\r\nUID:series") +
      "\r\n" +
      cancellation,
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /изменение отдельного занятия серии/);
});

test("недопустимая дата не становится другим занятием", () => {
  const result = probe(event.replaceAll("20261102", "20261131"));
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /недопустимую дату/);
});
