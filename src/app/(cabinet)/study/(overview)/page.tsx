import { SubjectCarousel } from "@/components/board/subject-carousel";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { getStudy, type SubjectStanding } from "@/server/queries/study";
import { Flaps } from "@/components/board/flaps";
import Link from "next/link";
import { dayMonth, mskDate } from "@/lib/time";

export const dynamic = "force-dynamic";

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** G2: сводка одной фразой. */
function summary(subjects: SubjectStanding[]) {
  if (!subjects.length) return <>Дисциплины семестра пока не опубликованы.</>;
  if (subjects.every((s) => s.status === "unpublished"))
    return <>Данные о допуске пока не опубликованы.</>;
  const risky = subjects.filter(
    (s) => s.status === "at_risk" || s.status === "not_admitted",
  );
  if (!risky.length)
    return <>По опубликованным ведомостям допуск к сессии есть.</>;
  const s = risky[0];
  const pending = s.checklist.filter((item) => !item.done);
  const due = pending
    .flatMap((item) => (item.dueAt ? [item.dueAt] : []))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const count = pending.length;
  const requirements = [
    count ? `сдать ${count} ${plural(count, "работу", "работы", "работ")}` : "",
    s.missingPoints
      ? `набрать ${s.missingPoints} ${plural(s.missingPoints, "балл", "балла", "баллов")}`
      : "",
  ]
    .filter(Boolean)
    .join(" и ");
  return (
    <>
      {s.status === "not_admitted"
        ? "Допуска нет по дисциплине "
        : "Для допуска по дисциплине "}
      <b className="text-board-soon">«{s.name}»</b>
      {s.status === "at_risk" ? ` осталось ${requirements}` : ""}
      {s.status === "at_risk" && due
        ? `. Ближайший срок — ${dayMonth(mskDate(due))}`
        : ""}
      {risky.length > 1
        ? `. Проверить нужно ещё ${risky.length - 1} ${plural(risky.length - 1, "дисциплину", "дисциплины", "дисциплин")}`
        : ""}
      .
    </>
  );
}

export default async function StudyPage() {
  const user = await requireUser();
  if (user.role === "staff") redirect("/staff");
  if (!user.studentProfileId || !user.groupId) redirect("/profile");
  const study = await getStudy(user.studentProfileId, user.groupId);

  if (!study) {
    return (
      <main className="cabinet-page bg-board px-3.5 py-5 text-board-text md:rounded-3xl md:p-6">
        <h1 className="m-0 font-board text-[34px] font-extrabold uppercase">
          Учёба
        </h1>
        <p>Семестр ещё не начался или уже закончился.</p>
      </main>
    );
  }
  const avg =
    study.average !== null ? study.average.toFixed(1).replace(".", ",") : null;

  const rated = study.subjects.filter((s) => s.status !== "unpublished").length;
  const metrics = [
    ["Средний балл", avg],
    ["Долги", String(study.debts)],
    ["Допуск", `${study.admitted}/${rated}`],
  ] as const;
  return (
    <main className="cabinet-page flex flex-col gap-5 pb-4">
      <header className="grid items-center gap-5 bg-board p-4 text-board-text md:rounded-3xl md:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
        <div>
          <h1 className="font-board text-[34px] font-extrabold uppercase leading-none lg:text-[46px]">
            Учёба
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-board-muted">
            {study.term.name}
            {study.term.sessionStartsOn &&
              ` · сессия с ${dayMonth(study.term.sessionStartsOn)}`}
          </p>
          <p className="mt-3 text-sm">{summary(study.subjects)}</p>
          <Link href="/study/portfolio" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-board-row px-4 py-2 text-sm font-semibold text-board-link">Моё портфолио →</Link>
        </div>
        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-board-row p-3">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-board-muted">
                {label}
              </dt>
              <dd className="mt-2">
                {value && (label !== "Допуск" || rated) ? (
                  <Flaps value={value} label={`${label}: ${value}`} />
                ) : (
                  <span aria-label="Нет данных">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      {study.subjects.length > 0 && (
        <SubjectCarousel subjects={study.subjects} />
      )}
      <div className="mx-3 divide-y divide-border rounded-xl border border-border bg-surface px-4 md:mx-0">
        <details>
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">
            Как считаются показатели
          </summary>
          <p className="pb-3 text-sm text-text-muted">
            Посещения — присутствие на парах, по которым есть отметка в журнале.
            Работы — сданные из запланированных обязательных работ.
            Дополнительные достижения — полученные из опубликованных целей. Для
            допуска нужны 50 баллов из 100 и все обязательные работы. Средний
            балл считается по экзаменам за закрытые сессии.
          </p>
        </details>
        {study.history.map((h) => (
          <details key={h.term}>
            <summary className="min-h-11 cursor-pointer py-3 font-semibold">
              {h.term}
            </summary>
            <ul className="pb-3">
              {h.items.map((i, index) => (
                <li key={index} className="flex justify-between py-1 text-sm">
                  {i.name}
                  <b>{i.grade}</b>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </main>
  );
}
