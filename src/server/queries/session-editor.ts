import "server-only";
import { db } from "@/server/db";

/** Только дисциплины выбранной группы в выбранном семестре. */
export function sessionSubjects(groupId: string, termId: string) {
  return db.subject.findMany({
    where: {
      OR: [
        { lessons: { some: { groupId, termId } } },
        { assessments: { some: { groupId, termId } } },
        { admission: { some: { termId, student: { groupId } } } },
      ],
    },
    include: {
      assessments: {
        where: { groupId, termId, kind: { in: ["exam", "credit"] } },
        orderBy: [{ heldOn: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });
}
