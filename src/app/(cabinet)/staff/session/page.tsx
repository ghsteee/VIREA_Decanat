import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/guards";
import { requireStaffGroup, staffGroups } from "@/server/staff";
import { db } from "@/server/db";
import { sessionSubjects } from "@/server/queries/session-editor";
import { SessionForm } from "@/components/staff/session-form";
import { dayMonth, mskDate, mskTime } from "@/lib/time";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default async function StaffSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; term?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  if ((sp.group && !UUID.test(sp.group)) || (sp.term && !UUID.test(sp.term)))
    notFound();
  const [groups, terms] = await Promise.all([
    staffGroups(user.id),
    db.academicTerm.findMany({ orderBy: { startsOn: "desc" } }),
  ]);
  const groupId = sp.group ?? groups[0]?.id;
  const group = groupId ? await requireStaffGroup(user.id, groupId) : null;
  const today = mskDate();
  const term = sp.term
    ? terms.find((t) => t.id === sp.term)
    : (terms.find(
        (t) => mskDate(t.startsOn) <= today && mskDate(t.endsOn) >= today,
      ) ?? terms[0]);
  if (sp.term && !term) notFound();
  const courses = group && term ? await sessionSubjects(group.id, term.id) : [];
  const select =
    "min-h-11 min-w-0 rounded-xl border border-border bg-surface px-3 text-text";
  return (
    <main className="cabinet-page flex flex-col gap-5 p-4 md:p-6">
      <header className="rounded-2xl bg-board p-5 text-board-text">
        <Link
          href="/staff/schedule"
          className="inline-flex min-h-11 items-center font-semibold text-board-link"
        >
          ← Расписание занятий
        </Link>
        <h1 className="font-board text-[34px] font-bold uppercase">
          Расписание сессии
        </h1>
        <p className="mt-2 text-sm">
          Назначь экзамены и зачёты, выбери дату, время и аудиторию.
        </p>
      </header>
      <form className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
          Группа
          <select name="group" defaultValue={group?.id} className={select}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
          Семестр
          <select name="term" defaultValue={term?.id} className={select}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 self-end rounded-xl bg-action px-5 py-3 font-semibold text-on-action">
          Показать
        </button>
      </form>
      {group && term && (
        <section
          aria-label={`Аттестации ${group.code}`}
          className="grid items-start gap-3 lg:grid-cols-2"
        >
          {courses.map((course) => {
            const entries = course.assessments.length
              ? course.assessments
              : [null];
            return entries.map((a) => (
              <details
                key={`${group.id}-${term.id}-${course.id}-${entries.length === 1 ? "single" : a?.id}`}
                className="min-w-0 rounded-2xl border border-border bg-surface"
              >
                <summary className="min-h-11 cursor-pointer p-4">
                  <span className="font-semibold">{course.name}</span>
                  <span className="mt-1 block text-sm text-text-muted">
                    {a
                      ? a.kind === "exam"
                        ? "Экзамен"
                        : "Зачёт"
                      : "Форма контроля не назначена"}
                    {a?.heldOn
                      ? ` · ${dayMonth(mskDate(a.heldOn))}`
                      : " · дата уточняется"}
                    {a?.sessionStartsAt
                      ? ` · ${mskTime(a.sessionStartsAt)}`
                      : ""}
                  </span>
                </summary>
                <SessionForm
                  groupId={group.id}
                  termId={term.id}
                  subjectId={course.id}
                  assessmentId={a?.id}
                  version={a?.sessionVersion}
                  kind={a?.kind}
                  date={a?.heldOn ? mskDate(a.heldOn) : ""}
                  time={a?.sessionStartsAt ? mskTime(a.sessionStartsAt) : ""}
                  room={a?.sessionRoom ?? ""}
                  minDate={mskDate(term.startsOn)}
                  maxDate={mskDate(term.endsOn)}
                />
              </details>
            ));
          })}
        </section>
      )}
      {!courses.length && (
        <p className="rounded-xl bg-surface p-4 text-text-muted">
          В выбранном семестре у группы пока нет дисциплин.
        </p>
      )}
    </main>
  );
}
