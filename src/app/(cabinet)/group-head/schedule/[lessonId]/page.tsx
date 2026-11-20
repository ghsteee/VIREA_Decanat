import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGroupHead } from "@/server/auth/guards";
import { db } from "@/server/db";
import { LessonForm } from "@/components/staff/forms";
import { pairByStart } from "@/lib/pairs";
import { mskDate, mskTime } from "@/lib/time";
import { updateGroupLesson } from "../../actions";

export const dynamic = "force-dynamic";

export default async function GroupLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { groupId } = await requireGroupHead();
  const { lessonId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(lessonId))
    notFound();
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, groupId },
    include: { subject: { select: { name: true } } },
  });
  if (!lesson) notFound();
  const rooms = await db.room.findMany({
    include: { campus: true },
    orderBy: [{ campus: { code: "asc" } }, { number: "asc" }],
  });

  return (
    <main className="cabinet-page flex flex-col gap-4 bg-board px-4 py-4 text-board-text md:rounded-3xl">
      <Link
        href="/group-head"
        className="flex min-h-11 items-center text-board-link"
      >
        ‹ Староста
      </Link>
      <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-none">
        Изменить пару
      </h1>
      <p>{lesson.subject.name}</p>
      <section className="rounded-xl bg-board-row p-4">
        <LessonForm
          publishAction={updateGroupLesson}
          lessonId={lesson.id}
          version={lesson.version}
          date={mskDate(lesson.startsAt)}
          pair={pairByStart(mskTime(lesson.startsAt)) ?? 1}
          roomId={lesson.roomId ?? rooms[0]?.id ?? ""}
          format={lesson.format}
          onlineUrl={lesson.onlineUrl ?? ""}
          rooms={rooms.map((room) => ({
            id: room.id,
            label: `${room.campus.code}-${room.number}`,
          }))}
        />
      </section>
    </main>
  );
}
