import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionForm } from "@/components/staff/session-form";
import { dayMonth, mskDate, mskTime } from "@/lib/time";
import { requireStaff } from "@/server/auth/guards";
import { db } from "@/server/db";
import { sessionSubjects } from "@/server/queries/session-editor";
import { requireStaffGroup, staffGroups } from "@/server/staff";

type Filters = {
  group?: string;
  term?: string;
  subject?: string;
  assessment?: string;
};
const field =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-text";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default async function StaffSessionPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const user = await requireStaff();
  const filters = await searchParams;
  if (
    [filters.group, filters.term, filters.subject, filters.assessment].some(
      (id) => id !== undefined && (typeof id !== "string" || !uuid.test(id)),
    )
  )
    notFound();
  const [groups, terms] = await Promise.all([
    staffGroups(user.id),
    db.academicTerm.findMany({ orderBy: { startsOn: "desc" } }),
  ]);
  const groupId = filters.group ?? groups[0]?.id;
  const group = groupId ? await requireStaffGroup(user.id, groupId) : null;
  const today = mskDate();
  const term = filters.term
    ? terms.find(({ id }) => id === filters.term)
    : (terms.find(
        (item) =>
          mskDate(item.startsOn) <= today && mskDate(item.endsOn) >= today,
      ) ?? terms[0]);
  if (filters.term && !term) notFound();
  const subjects =
    group && term ? await sessionSubjects(group.id, term.id) : [];
  const selected = filters.subject
    ? subjects.find(({ id }) => id === filters.subject)
    : null;
  if (filters.subject && !selected) notFound();
  const assessment = filters.assessment
    ? selected?.assessments.find(({ id }) => id === filters.assessment)
    : selected?.assessments[0];
  if (filters.assessment && !assessment) notFound();
  const href = (subject: string, assessment?: string) =>
    "/staff/session?" +
    new URLSearchParams({
      group: group!.id,
      term: term!.id,
      subject,
      ...(assessment ? { assessment } : {}),
    });

  return (
    <main className="cabinet-page flex flex-col gap-4 p-3 md:p-6">
      <header className="rounded-2xl bg-board p-5 text-board-text">
        <Link
          href={group ? `/staff/schedule?group=${group.id}` : "/staff/schedule"}
          className="inline-flex min-h-11 items-center font-semibold text-board-link"
        >
          ← Расписание занятий
        </Link>
        <h1 className="font-board text-4xl font-bold uppercase">
          Редактор сессии
        </h1>
      </header>
      {groups.length > 0 && terms.length > 0 && (
        <form className="grid items-end gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-2 text-sm font-semibold">
            Группа
            <select name="group" defaultValue={group?.id} className={field}>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Семестр
            <select name="term" defaultValue={term?.id} className={field}>
              {terms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button className="min-h-11 rounded-xl bg-action px-5 font-semibold text-on-action">
            Показать дисциплины
          </button>
        </form>
      )}
      {subjects.length > 0 && group && term ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.5fr)]">
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-2 font-board text-2xl font-bold uppercase">
              Дисциплины
            </h2>
            <ul className="divide-y divide-border">
              {subjects.map((item) => (
                <li key={item.id}>
                  <Link
                    href={href(item.id)}
                    aria-current={selected?.id === item.id ? "page" : undefined}
                    className="grid min-h-11 gap-1 rounded-lg px-2 py-3 aria-[current=page]:bg-board aria-[current=page]:text-board-text"
                  >
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-sm">
                      {item.assessments.length
                        ? item.assessments
                            .map(
                              (entry) =>
                                (entry.kind === "exam" ? "Экзамен" : "Зачёт") +
                                (entry.heldOn
                                  ? ` · ${dayMonth(mskDate(entry.heldOn))}`
                                  : " · дата уточняется"),
                            )
                            .join(", ")
                        : "Форма контроля не назначена"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="min-w-0 rounded-2xl border border-border bg-surface">
            {selected ? (
              <>
                <h2 className="p-4 font-board text-2xl font-bold uppercase">
                  {selected.name}
                </h2>
                {selected.assessments.length > 1 && (
                  <nav
                    aria-label="Аттестации дисциплины"
                    className="flex flex-wrap gap-2 px-4 pb-3"
                  >
                    {selected.assessments.map((item) => (
                      <Link
                        key={item.id}
                        href={href(selected.id, item.id)}
                        aria-current={
                          item.id === assessment?.id ? "page" : undefined
                        }
                        className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 aria-[current=page]:bg-board"
                      >
                        {item.title}
                        {item.heldOn
                          ? ` · ${dayMonth(mskDate(item.heldOn))}`
                          : ""}
                      </Link>
                    ))}
                  </nav>
                )}
                <SessionForm
                  key={`${group.id}-${term.id}-${selected.id}-${filters.assessment ?? ""}`}
                  groupId={group.id}
                  termId={term.id}
                  subjectId={selected.id}
                  assessmentId={assessment?.id}
                  version={assessment?.sessionVersion}
                  kind={assessment?.kind}
                  date={assessment?.heldOn ? mskDate(assessment.heldOn) : ""}
                  time={
                    assessment?.sessionStartsAt
                      ? mskTime(assessment.sessionStartsAt)
                      : ""
                  }
                  room={assessment?.sessionRoom ?? ""}
                  minDate={mskDate(term.startsOn)}
                  maxDate={mskDate(term.endsOn)}
                />
              </>
            ) : (
              <p className="p-4 text-text-muted">
                Выбери дисциплину, чтобы назначить экзамен или зачёт.
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className="rounded-xl bg-surface p-4 text-text-muted">
          Для выбранной группы и семестра нет дисциплин.
        </p>
      )}
    </main>
  );
}
