/** Звонки ВТУ ВИРЭА (демо): номер пары → начало и конец. */
export const PAIRS: Record<number, { start: string; end: string }> = {
  1: { start: "09:00", end: "10:30" },
  2: { start: "10:40", end: "12:10" },
  3: { start: "12:40", end: "14:10" },
  4: { start: "14:20", end: "15:50" },
  5: { start: "16:20", end: "17:50" },
  6: { start: "18:00", end: "19:30" },
};

export function pairByStart(time: string): number | null {
  const hit = Object.entries(PAIRS).find(([, p]) => p.start === time);
  return hit ? Number(hit[0]) : null;
}
