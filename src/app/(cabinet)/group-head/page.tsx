import Link from "next/link";
import { requireGroupHead } from "@/server/auth/guards";
import { db } from "@/server/db";
import { PostForm } from "@/components/staff/forms";
import { ReadStats } from "@/components/staff/read-stats";
import { addDays, dayMonth, mskDate, mskDayStart, mskTime } from "@/lib/time";
import { publishToGroup } from "./actions";

export const dynamic = "force-dynamic";

export default async function GroupHeadPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { id, groupId } = await requireGroupHead();
  const today = mskDate();
  const [group, lessons, { done }] = await Promise.all([
    db.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { code: true },
    }),
    db.lesson.findMany({
      where: {
        groupId,
        startsAt: {
          gte: mskDayStart(today),
          lt: mskDayStart(addDays(today, 8)),
        },
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, startsAt: true, subject: { select: { name: true } } },
    }),
    searchParams,
  ]);

  return (
    <main className="cabinet-page cabinet-columns flex flex-col gap-4 bg-board px-4 py-4 text-board-text md:rounded-3xl md:p-6 lg:grid lg:grid-cols-2 lg:gap-x-6">
      <Link
        href="/profile"
        className="flex min-h-11 items-center text-board-link lg:col-span-2"
      >
        ‹ Профиль
      </Link>
      <div className="lg:col-span-2">
        <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-none">
          Староста
        </h1>
        <p className="mt-2 text-board-muted">
          Публикации только для группы {group.code}.
        </p>
      </div>
      {done === "1" ? (
        <p
          role="status"
          className="rounded-lg bg-plate-success px-3 py-2 text-plate-ink lg:col-span-2"
        >
          Опубликовано.
        </p>
      ) : null}
      <section
        className="rounded-xl bg-board-row p-4"
        aria-labelledby="post-title"
      >
        <h2
          id="post-title"
          className="mb-3 font-board text-2xl font-bold uppercase"
        >
          Написать группе
        </h2>
        <PostForm publishAction={publishToGroup} />
      </section>
      <section
        className="rounded-xl bg-board-row p-4"
        aria-labelledby="lessons-title"
      >
        <h2
          id="lessons-title"
          className="mb-2 font-board text-2xl font-bold uppercase"
        >
          Изменить пару
        </h2>
        {lessons.length ? (
          <ul className="m-0 list-none p-0">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="border-t border-board-line">
                <Link
                  href={`/group-head/schedule/${lesson.id}`}
                  className="flex min-h-11 items-center gap-3 py-2 text-board-link"
                >
                  <span className="shrink-0">
                    {dayMonth(mskDate(lesson.startsAt))} ·{" "}
                    {mskTime(lesson.startsAt)}
                  </span>
                  <span>{lesson.subject.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>Ближайших пар нет.</p>
        )}
      </section>
      <section
        className="rounded-xl bg-board-row p-4 lg:col-span-2"
        aria-labelledby="read-title"
      >
        <h2
          id="read-title"
          className="mb-2 font-board text-2xl font-bold uppercase"
        >
          Уже опубликовано · прочитали
        </h2>
        <ReadStats
          authorId={id}
          groupId={groupId}
          kinds={["lesson_change", "deadline", "announcement"]}
        />
      </section>
    </main>
  );
}
