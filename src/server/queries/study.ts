import "server-only";
import { db } from "@/server/db";
import { mskDate } from "@/lib/time";

/**
 * Учёба по демо-положению ВТУ ВИРЭА (docs/knowledge/polozhenie-demo.md):
 * рейтинг 0–100 (п. 2.1), допуск — от 50 баллов и все обязательные работы (п. 3.1),
 * «риск» — пока сессия не началась (п. 3.3), средний балл — по экзаменам (п. 4.5).
 */
const ADMISSION_POINTS = 50;
const MANDATORY = new Set(["lab", "practice", "test", "essay"]);

export type SubjectStanding = {
  subjectId: string;
  name: string;
  controlTypes: ("exam" | "credit")[];
  points: number;
  missingPoints: number;
  labs: { done: number; total: number };
  assessments: { title: string; result: string; heldOn: Date | null }[];
  status: "admitted" | "at_risk" | "not_admitted" | "unpublished";
  attendance: { present: number; recorded: number };
  assignments: { title: string; done: boolean; dueAt: Date | null }[];
  achievements: { title: string; earned: boolean }[];
  checklist: { title: string; done: boolean; dueAt: Date | null }[];
};

export async function getStudy(
  studentId: string,
  groupId: string,
  now = new Date(),
) {
  const day = new Date(mskDate(now));
  const term = await db.academicTerm.findFirst({
    where: { startsOn: { lte: day }, endsOn: { gte: day } },
    orderBy: { startsOn: "desc" },
  });
  if (!term) return null;

  const groupTerm = { groupId, termId: term.id };
  const studentTerm = { studentId, termId: term.id };
  const [courses, marks] = await Promise.all([
    db.subject.findMany({
      where: {
        OR: [
          { assessments: { some: groupTerm } },
          { lessons: { some: groupTerm } },
          { admission: { some: studentTerm } },
          { achievements: { some: studentTerm } },
        ],
      },
      include: {
        assessments: {
          where: groupTerm,
          include: { results: { where: { studentId } } },
          orderBy: { title: "asc" },
        },
        admission: { where: studentTerm, orderBy: { sortOrder: "asc" } },
        achievements: {
          where: studentTerm,
          select: { title: true, earned: true },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.lessonAttendance.findMany({
      where: {
        studentId,
        lesson: { ...groupTerm, status: "scheduled", endsAt: { lte: now } },
      },
      select: { present: true, lesson: { select: { subjectId: true } } },
    }),
  ]);
  const attendance = new Map<string, SubjectStanding["attendance"]>();
  for (const mark of marks) {
    const key = mark.lesson.subjectId;
    const counts = attendance.get(key) ?? { present: 0, recorded: 0 };
    counts.recorded++;
    if (mark.present) counts.present++;
    attendance.set(key, counts);
  }
  const sessionStarted = !!term.sessionStartsOn && term.sessionStartsOn <= day;
  const subjects: SubjectStanding[] = courses.map((subject) => {
    const list = subject.assessments;
    const points = list.reduce((sum, assessment) => {
      const result = assessment.results[0];
      return sum + (result?.scale === "points100" ? (result.value ?? 0) : 0);
    }, 0);
    const missingPoints = Math.max(0, ADMISSION_POINTS - points);
    const mandatory = list.filter((a) => MANDATORY.has(a.kind));
    const own = subject.admission;
    const hasStanding =
      own.length > 0 ||
      list.some(
        (a) =>
          (a.kind !== "exam" && a.kind !== "credit") || a.results.length > 0,
      );
    const admissionByTitle = new Map(own.map((item) => [item.title, item]));
    const assignments = mandatory.map((a) => {
      const item = admissionByTitle.get(a.title);
      const result = a.results[0];
      const done = item
        ? item.status === "done"
        : !!result &&
          (result.scale === "pass_fail"
            ? result.passed === true
            : result.scale === "grade5"
              ? (result.value ?? 0) >= 3
              : result.value !== null);
      return {
        title: a.title,
        done,
        dueAt: item?.dueAt ?? null,
        lab: a.kind === "lab",
      };
    });
    const titled = new Set(own.map((i) => i.title));
    const checklist = [
      ...own.map((i) => ({
        title: i.title,
        done: i.status === "done",
        dueAt: i.dueAt,
      })),
      ...assignments.filter(
        (a) => !titled.has(a.title) && (!own.length || !a.done),
      ),
    ];
    const labs = assignments.filter((a) => a.lab);
    const ok = missingPoints === 0 && checklist.every((item) => item.done);
    return {
      subjectId: subject.id,
      name: subject.name,
      controlTypes: (["exam", "credit"] as const).filter((kind) =>
        list.some((assessment) => assessment.kind === kind),
      ),
      points,
      missingPoints,
      assessments: list.map((a) => {
        const result = a.results[0];
        let label = "Результат пока не опубликован";
        if (result?.scale === "pass_fail" && result.passed !== null)
          label = result.passed ? "Зачтено" : "Не зачтено";
        if (result?.scale === "grade5" && result.value !== null)
          label = `Оценка: ${result.value}`;
        if (result?.scale === "points100" && result.value !== null)
          label =
            a.maxPoints === null
              ? `Баллы: ${result.value}`
              : `${result.value} из ${a.maxPoints} баллов`;
        return { title: a.title, result: label, heldOn: a.heldOn };
      }),
      labs: {
        done: labs.filter((a) => a.done).length,
        total: labs.length,
      },
      attendance: attendance.get(subject.id) ?? { present: 0, recorded: 0 },
      assignments: mandatory.length
        ? assignments
        : own.map((i) => ({
            title: i.title,
            done: i.status === "done",
            dueAt: i.dueAt,
          })),
      achievements: subject.achievements,
      status: !hasStanding
        ? "unpublished"
        : ok
          ? "admitted"
          : sessionStarted
            ? "not_admitted"
            : "at_risk",
      checklist,
    };
  });
  const priority = { not_admitted: 0, at_risk: 1, admitted: 2, unpublished: 3 };
  subjects.sort((a, b) => priority[a.status] - priority[b.status]);

  // Средний балл — по экзаменам прошлых закрытых сессий (п. 4.5)
  const exams = await db.assessmentResult.findMany({
    where: {
      studentId,
      scale: "grade5",
      assessment: { term: { endsOn: { lt: now } } },
    },
    include: { assessment: { include: { subject: true, term: true } } },
    orderBy: { publishedAt: "desc" },
  });
  const avg = exams.length
    ? exams.reduce((s, r) => s + (r.value ?? 0), 0) / exams.length
    : null;
  const history = new Map<
    string,
    { term: string; items: { name: string; grade: number | null }[] }
  >();
  for (const r of exams) {
    const key = r.assessment.term.name;
    const h = history.get(key) ?? { term: key, items: [] };
    h.items.push({ name: r.assessment.subject.name, grade: r.value });
    history.set(key, h);
  }

  return {
    term: {
      name: term.name,
      sessionStartsOn: term.sessionStartsOn
        ? mskDate(term.sessionStartsOn)
        : null,
    },
    subjects,
    admitted: subjects.filter((s) => s.status === "admitted").length,
    debts: subjects.filter((s) => s.status === "not_admitted").length,
    average: avg,
    history: [...history.values()],
  };
}
