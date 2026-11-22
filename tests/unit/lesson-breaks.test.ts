import assert from "node:assert/strict";
import test from "node:test";
import { lessonBreaks } from "../../src/lib/lesson-breaks";

function lesson(id: string, start: string, end: string, kind = "planned") {
  return {
    id,
    startsAt: new Date(`2026-11-23T${start}:00+03:00`),
    endsAt: new Date(`2026-11-23T${end}:00+03:00`),
    state: { kind },
  };
}

test("звонки чередуют перерывы 10 и 30 минут, без вставки после последней пары", () => {
  const gaps = lessonBreaks([
    lesson("1", "09:00", "10:30"),
    lesson("2", "10:40", "12:10"),
    lesson("3", "12:40", "14:10"),
    lesson("4", "14:20", "15:50"),
    lesson("5", "16:20", "17:50"),
    lesson("6", "18:00", "19:30"),
  ]);
  assert.deepEqual(
    [...gaps.values()].map((gap) => gap.minutes),
    [10, 30, 10, 30, 10],
  );
  assert.equal(gaps.has("1"), false);
});

test("отменённая пара даёт настоящее окно, перенос меняет интервал", () => {
  const gaps = lessonBreaks([
    lesson("1", "09:00", "10:30"),
    lesson("2", "10:40", "12:10", "cancelled"),
    lesson("3", "12:40", "14:10"),
    lesson("4", "14:40", "16:10", "moved"),
  ]);
  assert.equal(gaps.has("2"), false);
  assert.equal(gaps.get("3")?.minutes, 130);
  assert.equal(gaps.get("4")?.minutes, 30);
});

test("пересекающиеся пары не создают ложный перерыв", () => {
  const gaps = lessonBreaks([
    lesson("3", "12:40", "14:10"),
    lesson("1", "09:00", "12:10"),
    lesson("2", "10:40", "11:30"),
  ]);
  assert.deepEqual([...gaps.keys()], ["3"]);
  assert.equal(gaps.get("3")?.minutes, 30);
  assert.equal(lessonBreaks([]).size, 0);
});
