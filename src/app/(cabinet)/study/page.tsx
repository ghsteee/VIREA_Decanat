import { BoardDetailRow } from "@/components/board/lesson-row";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { getStudy, type SubjectStanding } from "@/server/queries/study";
import { Flaps } from "@/components/board/flaps";
import { ConceptNote } from "@/components/concept-note";
import { dayMonth, mskDate } from "@/lib/time";
import { cn } from "@/lib/utils";

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
  const risky = subjects.filter((s) => s.status !== "admitted");
  if (!risky.length)
    return <>Допуск к сессии есть по всем дисциплинам. Так держать.</>;
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

const STATUS = {
  admitted: { label: "допущен", cls: "text-board-ok" },
  at_risk: { label: "риск", cls: "text-board-soon" },
  not_admitted: { label: "не допущен", cls: "text-board-danger-text" },
} as const;

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

  return (
    <main className="cabinet-page flex flex-col lg:grid lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)] lg:items-start lg:gap-6">
      <section
        aria-labelledby="st-title"
        className="min-w-0 flex flex-col gap-3.5 bg-board px-3 pb-1.5 pt-4 text-board-text md:rounded-3xl md:p-6"
      >
        <div className="px-0.5">
          <h1
            id="st-title"
            className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]"
          >
            Учёба
          </h1>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
            {study.term.name}
            {study.term.sessionStartsOn
              ? ` · сессия с ${dayMonth(study.term.sessionStartsOn)}`
              : ""}
          </p>
        </div>
        <p className="m-0 px-0.5 text-[15px] leading-[21px]">
          {summary(study.subjects)}
        </p>
        <div className="grid grid-cols-3 gap-2 px-0.5">
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
              Средний
            </span>
            {avg ? (
              <Flaps
                value={avg.replace(",", ".")}
                label={`Средний балл ${avg}`}
                size="lg"
              />
            ) : (
              <span className="font-board text-3xl">—</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
              Долги
            </span>
            <Flaps
              value={String(study.debts)}
              label={`Долгов: ${study.debts}`}
              size="lg"
            />
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
              Допуск
            </span>
            <span className="whitespace-nowrap">
              <Flaps
                value={String(study.admitted)}
                label={`Допуск по ${study.admitted} из ${study.subjects.length}`}
                size="lg"
              />
              <span
                className="mx-0.5 font-board text-2xl font-extrabold text-board-link"
                aria-hidden
              >
                /
              </span>
              <Flaps value={String(study.subjects.length)} size="lg" />
            </span>
          </div>
        </div>

        <div role="table" aria-label="Дисциплины семестра">
          <div
            role="row"
            className="grid grid-cols-[minmax(0,1fr)_46px_96px] gap-2 px-0.5 py-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-board-head"
          >
            <span role="columnheader">Дисциплина</span>
            <span role="columnheader" className="text-right">
              Балл
            </span>
            <span role="columnheader" className="text-right">
              Допуск
            </span>
          </div>
          {study.subjects.map((s) => {
            const open = s.status !== "admitted";
            const row = (
              <div
                role="row"
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_46px_96px] items-center gap-2 px-0.5 py-2.5",
                  !open && "border-t border-board-line",
                )}
              >
                <div role="cell" className="min-w-0">
                  <div className="truncate font-board text-[19px] font-extrabold uppercase leading-[22px] tracking-[0.03em]">
                    {s.name}
                  </div>
                  {s.works.total ? (
                    <div className="text-[12.5px] text-board-muted">
                      {s.works.done} из {s.works.total} {s.works.kind}
                    </div>
                  ) : null}
                </div>
                <div role="cell" className="text-right">
                  <Flaps
                    value={String(s.points)}
                    label={`${s.points} баллов`}
                  />
                </div>
                <div
                  role="cell"
                  className={cn(
                    "text-right font-board text-[15px] font-bold uppercase tracking-[0.06em]",
                    STATUS[s.status].cls,
                  )}
                >
                  {STATUS[s.status].label}
                </div>
              </div>
            );
            if (!open)
              return (
                <div key={s.subjectId} role="rowgroup">
                  {row}
                  {s.checklist.length ? (
                    <BoardDetailRow>
                      <details className="mb-1 px-0.5 text-[13px]">
                        <summary className="flex min-h-11 cursor-pointer items-center text-board-link">
                          Чек-лист допуска · выполнен
                        </summary>
                        <ul className="m-0 pb-2 pl-5 text-board-muted">
                          {s.checklist.map((item, index) => (
                            <li key={index}>{item.title} — сдано</li>
                          ))}
                        </ul>
                      </details>
                    </BoardDetailRow>
                  ) : null}
                </div>
              );
            const done = s.checklist.filter((c) => c.done).length;
            return (
              <div
                key={s.subjectId}
                role="rowgroup"
                className="-mx-1 mb-1.5 rounded-[10px] bg-board-soon-row px-1 pb-2"
              >
                {row}
                <BoardDetailRow>
                  <div className="mx-0.5 flex flex-col gap-2.5 rounded-lg bg-board-row p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link">
                        Чек-лист допуска
                      </span>
                      <span className="text-xs text-board-muted">
                        {done} из {s.checklist.length}
                      </span>
                    </div>
                    <div
                      aria-hidden
                      className="grid gap-[3px]"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(s.checklist.length, 1)}, minmax(0,1fr))`,
                      }}
                    >
                      {s.checklist.map((c, i) => (
                        <i
                          key={i}
                          className={cn(
                            "h-1.5 rounded-sm",
                            c.done ? "bg-board-link" : "bg-board-line",
                          )}
                        />
                      ))}
                    </div>
                    {s.missingPoints ? (
                      <p className="m-0 text-[13.5px] text-board-soon">
                        До 50 баллов не хватает {s.missingPoints}.
                      </p>
                    ) : null}
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13.5px] leading-[18px]">
                      {s.checklist.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span
                            className={cn(
                              "w-[60px] flex-none font-board text-[15px] font-bold uppercase tracking-[0.06em]",
                              c.done ? "text-board-ok" : "text-board-soon",
                            )}
                          >
                            {c.done
                              ? "сдано"
                              : c.dueAt
                                ? `до ${dayMonth(mskDate(c.dueAt))}`
                                : "нужно"}
                          </span>
                          {c.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                </BoardDetailRow>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-3 px-4 pb-3 pt-3.5 md:mt-5 md:rounded-3xl md:bg-surface md:p-6 lg:mt-0">
        <p className="m-0 text-[12.5px] leading-[17px] text-text-muted">
          Балл — рейтинг за семестр из 100. Допуск — от 50 баллов и все
          обязательные работы; средний — по экзаменам (демо-положение ВТУ ВИРЭА,
          разделы 2–4).
        </p>
        {study.history.length ? (
          <section aria-labelledby="hist">
            <h2
              id="hist"
              className="mb-1 font-board text-[22px] font-extrabold uppercase leading-[26px] tracking-[0.03em]"
            >
              Прошлые семестры
            </h2>
            {study.history.map((h) => (
              <details key={h.term} className="border-t border-border py-2">
                <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
                  {h.term}
                </summary>
                <ul className="m-0 list-none p-0">
                  {h.items.map((i) => (
                    <li
                      key={i.name}
                      className="flex justify-between py-1 text-[14px]"
                    >
                      {i.name}
                      <b>{i.grade}</b>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        ) : null}
        <ConceptNote />
      </div>
    </main>
  );
}
