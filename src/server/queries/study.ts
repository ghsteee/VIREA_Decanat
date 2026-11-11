import "server-only";
import { db } from "@/server/db";
import { mskDate } from "@/lib/time";

/**
 * Учёба по демо-положению ВТУ ВИРЭА (docs/knowledge/polozhenie-demo.md):
 * рейтинг 0–100 (п. 2.1), допуск — от 50 баллов и все обязательные работы (п. 3.1),
 * «риск» — пока сессия не началась (п. 3.3), средний балл — по экзаменам (п. 4.5).
 */
const ADMISSION_POINTS = 50;
const MANDATORY = new Set(["lab", "test", "essay"]);

export type SubjectStanding = {
  subjectId: string;
  name: string;
  points: number;
  works: { done: number; total: number; kind: string };
  status: "admitted" | "at_risk" | "not_admitted";
  checklist: { title: string; done: boolean; dueAt: Date | null }[];
};

export async function getStudy(
  studentId: string,
  groupId: string,
  now = new Date(),
) {
  const term = await db.academicTerm.findFirst({
    where: { startsOn: { lte: now }, endsOn: { gte: now } },
    orderBy: { startsOn: "desc" },
  });
  if (!term) return null;

  const assessments = await db.assessment.findMany({
    where: { groupId, termId: term.id },
    include: { subject: true, results: { where: { studentId } } },
    orderBy: { title: "asc" },
  });
  const items = await db.admissionItem.findMany({
    where: { studentId, termId: term.id },
    orderBy: { sortOrder: "asc" },
  });
  const sessionStarted = term.sessionStartsOn
    ? term.sessionStartsOn <= now
    : false;

  const bySubject = new Map<string, typeof assessments>();
  for (const a of assessments)
    bySubject.set(a.subjectId, [...(bySubject.get(a.subjectId) ?? []), a]);

  const subjects: SubjectStanding[] = [...bySubject.values()].map((list) => {
    const subject = list[0].subject;
    const points = list.reduce((s, a) => s + (a.results[0]?.value ?? 0), 0);
    const mandatory = list.filter((a) => MANDATORY.has(a.kind));
    const labs = list.filter((a) => a.kind === "lab");
    const shown = labs.length ? labs : mandatory;
    const done = shown.filter((a) => a.results.length).length;
    const mandatoryDone = mandatory.every((a) => a.results.length);
    const ok = points >= ADMISSION_POINTS && mandatoryDone;
    const own = items.filter((i) => i.subjectId === subject.id);
    return {
      subjectId: subject.id,
      name: subject.shortName ?? subject.name,
      points,
      works: { done, total: shown.length, kind: labs.length ? "лаб" : "работ" },
      status: ok ? "admitted" : sessionStarted ? "not_admitted" : "at_risk",
      checklist: own.length
        ? own.map((i) => ({
            title: i.title,
            done: i.status === "done",
            dueAt: i.dueAt,
          }))
        : mandatory.map((a) => ({
            title: a.title,
            done: a.results.length > 0,
            dueAt: null,
          })),
    };
  });
  subjects.sort(
    (a, b) => Number(a.status === "admitted") - Number(b.status === "admitted"),
  );

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
