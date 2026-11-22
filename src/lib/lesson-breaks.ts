type Lesson = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  state: { kind: string };
};

export type LessonBreak = { from: Date; to: Date; minutes: number };

/** Интервалы внутри одного учебного дня, с учётом отмен и пересечений. */
export function lessonBreaks(lessons: readonly Lesson[]) {
  const breaks = new Map<string, LessonBreak>();
  let occupiedUntil: Date | null = null;
  const ordered = [...lessons].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  for (const lesson of ordered) {
    if (lesson.state.kind === "cancelled") continue;
    if (occupiedUntil && lesson.startsAt > occupiedUntil) {
      const minutes = Math.round(
        (lesson.startsAt.getTime() - occupiedUntil.getTime()) / 60_000,
      );
      if (minutes > 0)
        breaks.set(lesson.id, {
          from: occupiedUntil,
          to: lesson.startsAt,
          minutes,
        });
    }
    if (!occupiedUntil || lesson.endsAt > occupiedUntil)
      occupiedUntil = lesson.endsAt;
  }
  return breaks;
}
