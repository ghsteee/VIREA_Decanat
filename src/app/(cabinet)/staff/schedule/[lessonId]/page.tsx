import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/guards";
import { requireStaffGroup } from "@/server/staff";
import { db } from "@/server/db";
import { LessonForm } from "@/components/staff/forms";
import { BoardHead, LessonRow } from "@/components/board/lesson-row";
import { getLessons } from "@/server/queries/schedule";
import { pairByStart } from "@/lib/pairs";
import { mskDate, mskTime } from "@/lib/time";
import { ConceptNote } from "@/components/concept-note";

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const user = await requireStaff();
  const { lessonId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) notFound();
  const group = await requireStaffGroup(user.id, lesson.groupId);
  const [view] = await getLessons(
    group.id,
    lesson.startsAt,
    new Date(lesson.startsAt.getTime() + 1),
  );
  const rooms = await db.room.findMany({
    include: { campus: true },
    orderBy: [{ campus: { code: "asc" } }, { number: "asc" }],
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-4 bg-board px-4 pb-6 pt-4 text-board-text">
      <Link
        href={`/staff/schedule?group=${group.id}&date=${mskDate(lesson.startsAt)}`}
        className="text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted"
      >
        ‹ {group.code}
      </Link>
      <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]">
        Изменить пару
      </h1>
      {view ? (
        <div role="table">
          <BoardHead />
          <LessonRow lesson={view} details />
        </div>
      ) : null}
      <section className="rounded-2xl bg-board-row p-4">
        <LessonForm
          lessonId={lesson.id}
          version={lesson.version}
          date={mskDate(lesson.startsAt)}
          pair={pairByStart(mskTime(lesson.startsAt)) ?? 1}
          roomId={lesson.roomId ?? rooms[0]?.id ?? ""}
          format={lesson.format}
          onlineUrl={lesson.onlineUrl ?? ""}
          rooms={rooms.map((r) => ({
            id: r.id,
            label: `${r.campus.code}-${r.number}`,
          }))}
        />
      </section>
      <ConceptNote className="text-[11px] text-board-muted" />
    </main>
  );
}
