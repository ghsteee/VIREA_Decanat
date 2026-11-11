// Время в Москве: учебный день, неделя и все надписи считаем в Europe/Moscow.
export const TZ = "Europe/Moscow";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** YYYY-MM-DD по Москве. */
export function mskDate(d: Date = new Date()): string {
  return dateFmt.format(d);
}

/** HH:MM по Москве. */
export function mskTime(d: Date): string {
  return timeFmt.format(d);
}

/** Начало суток по Москве для даты YYYY-MM-DD. */
export function mskDayStart(date: string): Date {
  return new Date(`${date}T00:00:00+03:00`);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return mskDate(d);
}

/** 1 — понедельник … 7 — воскресенье. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00+03:00`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekStart(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const WEEKDAYS_FULL = [
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
  "воскресенье",
];

export function weekdayShort(date: string): string {
  return WEEKDAYS[isoWeekday(date) - 1];
}

export function weekdayFull(date: string): string {
  return WEEKDAYS_FULL[isoWeekday(date) - 1];
}

/** «12.11» */
export function dayMonth(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}.${m}`;
}

/** Разница в днях между датами YYYY-MM-DD (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (mskDayStart(b).getTime() - mskDayStart(a).getTime()) / 86_400_000,
  );
}

/** «2 дня», «5 дней», «1 день» */
export function pluralDays(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} день`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} дня`;
  return `${n} дней`;
}
