import { addDays, daysBetween, mskDate, mskDayStart, weekStart } from "./time";

export function calendarMonth(date: string) {
  const first = `${date.slice(0, 7)}-01`;
  const shift = (months: number) => {
    const value = new Date(`${first}T12:00:00+03:00`);
    value.setUTCMonth(value.getUTCMonth() + months);
    return mskDate(value);
  };
  const next = shift(1);
  const from = weekStart(first);
  const to = addDays(weekStart(addDays(next, -1)), 7);
  const days = Array.from({ length: daysBetween(from, to) }, (_, i) =>
    addDays(from, i),
  );
  const title = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  })
    .format(mskDayStart(first))
    .replace(/ г\.$/, "");
  return { first, next, previous: shift(-1), from, to, days, title };
}
