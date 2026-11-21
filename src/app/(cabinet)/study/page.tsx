import { SubjectGrid } from "@/components/board/subject-grid";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { getStudy } from "@/server/queries/study";
import { Flaps } from "@/components/board/flaps";
import { dayMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

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
      <header className="grid items-center gap-5 px-3 py-4 text-text md:px-0 md:py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h1 className="font-board text-[34px] font-extrabold uppercase leading-none lg:text-[46px]">
            Учёба
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            {study.term.name}
            {study.term.sessionStartsOn &&
              ` · сессия с ${dayMonth(study.term.sessionStartsOn)}`}
          </p>
        </div>
        <dl className="flex flex-wrap items-start gap-x-5 gap-y-3 sm:gap-x-9">
          {metrics.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm font-semibold text-text-muted">{label}</dt>
              <dd className="mt-2">
                {value && (label !== "Допуск" || rated) ? (
                  <Flaps size="lg" value={value} label={`${label}: ${value}`} />
                ) : (
                  <span
                    className="font-board text-3xl font-bold"
                    aria-label="Нет данных"
                  >
                    —
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      {study.subjects.length > 0 ? (
        <SubjectGrid subjects={study.subjects} />
      ) : (
        <p className="px-3 md:px-0">
          Дисциплины семестра пока не опубликованы.
        </p>
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
