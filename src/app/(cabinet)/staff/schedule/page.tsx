import Link from "next/link";
import { requireStaff } from "@/server/auth/guards";
import { requireStaffGroup, staffGroups } from "@/server/staff";
import {
  BoardDetailRow,
  BoardHead,
  LessonRow,
} from "@/components/board/lesson-row";
import { ReadStats } from "@/components/staff/read-stats";
import { dayRange, getLessons } from "@/server/queries/schedule";
import { mskDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function StaffSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; date?: string; done?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const groups = await staffGroups(user.id);
  const groupId = sp.group ?? groups[0]?.id;
  const date =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : mskDate();
  const group = groupId ? await requireStaffGroup(user.id, groupId) : null;
  const lessons = group ? await getLessons(group.id, ...dayRange(date)) : [];

  return (
    <main className="cabinet-page cabinet-columns flex flex-col gap-5 bg-board px-4 pb-6 pt-4 text-board-text lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)] lg:gap-7 lg:px-8 lg:pt-7 md:rounded-3xl">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em] lg:text-[46px] lg:leading-[44px]">
            Перенести пару
          </h1>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
            Выбери группу и день, затем пару
          </p>
          <Link
            href={group ? `/staff/session?group=${group.id}` : "/staff/session"}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-board-row px-4 font-semibold text-board-link"
          >
            Редактор сессии
          </Link>
        </div>
        {sp.done ? (
          <p
            role="status"
            className="m-0 rounded-lg bg-plate-success px-3 py-2 text-[14px] font-semibold text-plate-ink"
          >
            Опубликовано. Группа уже видит изменение.
          </p>
        ) : null}
        <form className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
          <label className="col-span-2 flex min-w-0 flex-col gap-1.5 text-[13px] text-board-muted sm:col-span-1">
            Группа
            <select
              name="group"
              defaultValue={group?.id}
              className="h-11 rounded-[10px] border border-board-line bg-surface px-2 text-[15px] text-text"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} · {g.institute.code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[13px] text-board-muted">
            День
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="h-11 min-w-0 rounded-[10px] border border-board-line bg-surface px-2 text-[15px] text-text"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-[10px] px-3 font-semibold"
            style={{ background: "var(--board-text)", color: "var(--board)" }}
          >
            Показать
          </button>
        </form>
        {lessons.length ? (
          <div role="table" aria-label="Пары группы">
            <BoardHead />
            {lessons.map((l) => (
              <div key={l.id} role="rowgroup">
                <LessonRow lesson={l} details />
                {l.state.kind !== "cancelled" ? (
                  <BoardDetailRow>
                    <Link
                      href={`/staff/schedule/${l.id}`}
                      className="mb-2 ml-[100px] inline-flex min-h-11 items-center font-board text-[15px] font-bold uppercase tracking-[0.06em] text-board-link"
                    >
                      Изменить ›
                    </Link>
                  </BoardDetailRow>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-board-line py-6 text-center font-board text-2xl font-extrabold uppercase">
            Пар нет
          </p>
        )}
      </div>
      <aside className="flex flex-col gap-2 rounded-2xl bg-board-row px-4 py-4">
        <h2 className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
          Уже опубликовано · прочитали
        </h2>
        <ReadStats authorId={user.id} kinds={["lesson_change"]} />
      </aside>
    </main>
  );
}
