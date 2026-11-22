import assert from "node:assert/strict";
import test from "node:test";
import { calendarMonth } from "../../src/lib/calendar-month";

test("месяц начинается с понедельника и покрывает крайние недели", () => {
  const november = calendarMonth("2026-11-21");
  assert.equal(november.days[0], "2026-10-26");
  assert.equal(november.days.at(-1), "2026-12-06");
  assert.equal(november.days.length, 42);
  assert.equal(
    november.days.filter((day) => day.startsWith("2026-11")).length,
    30,
  );
});

test("високосный февраль и февраль из четырёх недель", () => {
  const leap = calendarMonth("2024-02-29");
  assert.ok(leap.days.includes("2024-02-29"));
  assert.equal(leap.days.length, 35);
  const plain = calendarMonth("2027-02-15");
  assert.equal(plain.days.length, 28);
  assert.equal(plain.days[0], "2027-02-01");
  assert.equal(plain.days.at(-1), "2027-02-28");
});

test("листание месяца пересекает границу года без сдвига дня", () => {
  const december = calendarMonth("2026-12-31");
  assert.equal(december.first, "2026-12-01");
  assert.equal(december.next, "2027-01-01");
  assert.equal(calendarMonth(december.next).previous, "2026-12-01");
});
