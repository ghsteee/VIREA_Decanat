import type { SubjectStanding } from "@/server/queries/study";
import { ActivityRings } from "./activity-rings";
import { SubjectScore } from "./subject-score";
import { cn } from "@/lib/utils";
import { dayMonth, mskDate } from "@/lib/time";
const STATUS = {
  unpublished: { label: "Нет ведомости", cls: "text-text-muted" },
  admitted: { label: "Есть допуск", cls: "text-board-ok" },
  at_risk: { label: "Риск недопуска", cls: "text-board-soon" },
  not_admitted: { label: "Нет допуска", cls: "text-board-danger-text" },
} as const;

export function SubjectDetails({ subject: s }: { subject: SubjectStanding }) {
  const status = STATUS[s.status];
  const known = s.status !== "unpublished";
  const assignmentTitles = new Set(s.assignments.map((w) => w.title));
  const extraRequirements = s.checklist.filter(
    (item) => !assignmentTitles.has(item.title),
  );
  return (
    <div
      aria-labelledby={`subject-${s.subjectId}`}
      className="min-w-0 text-text"
    >
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2
            id={`subject-${s.subjectId}`}
            className="font-board text-2xl font-bold uppercase leading-tight"
          >
            {s.name}
          </h2>
          <SubjectScore subject={s} />
        </div>
        <p className={cn("mt-1 text-sm font-semibold", status.cls)}>
          {status.label}
        </p>
      </header>
      <ActivityRings subject={s} showLegend />
      {(s.assignments.length > 0 ||
        extraRequirements.length > 0 ||
        s.achievements.length > 0) && (
        <section className="border-t border-border pt-4">
          <h3 className="mb-2 font-board text-xl font-bold uppercase">
            Работы и достижения
          </h3>
          {s.labs.total > 0 && (
            <p className="mb-2 text-sm text-text-muted">
              {s.labs.done} из {s.labs.total} лаб сдано
            </p>
          )}
          {known && s.missingPoints > 0 && (
            <p className="mb-2 text-sm font-semibold">
              До 50 баллов не хватает {s.missingPoints}.
            </p>
          )}
          {s.assignments.length > 0 && (
            <ul>
              {s.assignments.map((item, i) => (
                <li
                  key={i}
                  className="flex flex-wrap justify-between gap-x-2 border-t border-border py-2 text-sm"
                >
                  <span>{item.title}</span>
                  <span className="text-text-muted">
                    {item.done
                      ? "Сдано"
                      : item.dueAt
                        ? `до ${dayMonth(mskDate(item.dueAt))}`
                        : "Нужно сдать"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {extraRequirements.length > 0 && (
            <>
              <h4 className="mt-3 font-semibold">Отметки допуска</h4>
              <ul>
                {extraRequirements.map((item, i) => (
                  <li key={i} className="py-1 text-sm">
                    {item.title} · {item.done ? "Выполнено" : "Нужно выполнить"}
                    {item.dueAt && ` · до ${dayMonth(mskDate(item.dueAt))}`}
                  </li>
                ))}
              </ul>
            </>
          )}
          {s.achievements.length > 0 && (
            <>
              <h4 className="mt-3 font-semibold">Дополнительные достижения</h4>
              <ul>
                {s.achievements.map((item) => (
                  <li key={item.title} className="py-1 text-sm">
                    {item.title} · {item.earned ? "Получено" : "Предстоит"}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {s.assessments.length > 0 && (
        <details className="mt-4 border-t border-border">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary">
            Оценки по работам и аттестациям
          </summary>
          <ul>
            {s.assessments.map((assessment, i) => (
              <li
                key={i}
                className="flex flex-wrap justify-between gap-x-3 border-t border-border py-2 text-sm"
              >
                <span>
                  {assessment.title}
                  {assessment.heldOn &&
                    ` · ${dayMonth(mskDate(assessment.heldOn))}`}
                </span>
                <span className="text-text-muted">{assessment.result}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
