import { db } from "@/server/db";
import { mskDate, mskTime, weekdayShort, dayMonth } from "@/lib/time";

/** «Уже опубликовано · прочитали N из M» по публикациям автора. Личности не раскрываются. */
export async function ReadStats({
  authorId,
  kinds,
}: {
  authorId: string;
  kinds: ("lesson_change" | "deadline" | "announcement")[];
}) {
  const items = await db.notification.findMany({
    where: {
      kind: { in: kinds },
      OR: [
        { lessonChange: { authorId } },
        { deadline: { authorId } },
        { announcement: { authorId } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      publishedAt: true,
      _count: { select: { recipients: true } },
      recipients: { where: { readAt: { not: null } }, select: { id: true } },
    },
  });
  if (!items.length)
    return (
      <p className="text-[14px] text-board-muted">
        Пока ничего не опубликовано.
      </p>
    );
  return (
    <ul className="m-0 list-none p-0">
      {items.map((n) => {
        const total = n._count.recipients;
        const read = n.recipients.length;
        return (
          <li
            key={n.id}
            className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 border-t border-board-line py-2.5"
          >
            <div className="min-w-0">
              <b className="block truncate text-[14px]">{n.title}</b>
              <span className="text-[12.5px] text-board-muted">
                {weekdayShort(mskDate(n.publishedAt))}{" "}
                {dayMonth(mskDate(n.publishedAt))}, {mskTime(n.publishedAt)}
              </span>
            </div>
            <div>
              <div className="mb-1 text-right text-[13px]">
                {read} из {total}
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-board-line"
                aria-hidden
              >
                <i
                  className="block h-full bg-plate-success"
                  style={{ width: `${total ? (read / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
