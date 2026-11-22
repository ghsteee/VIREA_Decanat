import Link from "next/link";
import { db } from "@/server/db";
import { dayMonth, mskDate, mskTime } from "@/lib/time";

/** groupId передаётся только из серверной сессии страницы расписания. */
export async function SessionSchedule({ groupId }: { groupId: string }) {
  const now = new Date();
  const term = await db.academicTerm.findFirst({
    where: { startsOn: { lte: now }, endsOn: { gte: now } },
    orderBy: { startsOn: "desc" },
  });
  const exams = term
    ? await db.assessment.findMany({
        where: { groupId, termId: term.id, kind: { in: ["exam", "credit"] } },
        include: { subject: true },
        orderBy: [{ heldOn: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      })
    : [];
  return (
    <div className="flex flex-col gap-4">
      {term ? (
        <p className="m-0 text-sm text-board-muted">
          {term.name}
          {term.sessionStartsOn
            ? ` · начало сессии ${dayMonth(mskDate(term.sessionStartsOn))}`
            : ""}
        </p>
      ) : null}
      {exams.length ? (
        <ul className="m-0 list-none p-0" aria-label="Экзамены и зачёты">
          {exams.map((exam) => (
            <li
              key={exam.id}
              className="flex flex-wrap items-start gap-x-5 gap-y-2 border-t border-board-line py-4"
            >
              <div className="min-w-[88px] font-board text-[22px] font-bold text-board-link">
                {exam.heldOn ? (
                  <time dateTime={mskDate(exam.heldOn)}>
                    {dayMonth(mskDate(exam.heldOn))}
                  </time>
                ) : (
                  "Дата уточняется"
                )}
                {exam.sessionStartsAt && (
                  <span className="mt-1 block text-lg text-board-text">
                    {mskTime(exam.sessionStartsAt)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 basis-44">
                <h3 className="font-board text-[22px] font-extrabold uppercase leading-6">
                  {exam.subject.name}
                </h3>
                <p className="mt-1 text-sm text-board-muted">
                  {exam.kind === "exam" ? "Экзамен" : "Зачёт"}
                  {exam.title.toLowerCase() !==
                  (exam.kind === "exam" ? "экзамен" : "зачёт")
                    ? ` · ${exam.title}`
                    : ""}
                </p>
                {exam.sessionRoom && (
                  <p className="mt-1 text-sm text-board-muted">
                    Аудитория {exam.sessionRoom}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-board-row px-4 py-5 text-sm text-board-muted">
          Даты экзаменов и зачётов ещё не опубликованы.
        </p>
      )}
      <Link
        href="/study"
        className="flex min-h-11 items-center justify-center self-start rounded-xl bg-board-row px-4 font-semibold text-board-link no-underline"
      >
        Проверить допуск
      </Link>
    </div>
  );
}
