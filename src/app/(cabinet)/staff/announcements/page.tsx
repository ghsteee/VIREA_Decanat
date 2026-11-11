import { requireStaff } from "@/server/auth/guards";
import { staffGroups } from "@/server/staff";
import { PostForm } from "@/components/staff/forms";
import { ReadStats } from "@/components/staff/read-stats";
import { ConceptNote } from "@/components/concept-note";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const groups = await staffGroups(user.id);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1100px] flex-col gap-5 bg-board px-4 pb-6 pt-4 text-board-text lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-7 lg:px-8 lg:pt-7">
      <div className="flex flex-col gap-4">
        <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em] lg:text-[46px] lg:leading-[44px]">
          Дедлайны и объявления
        </h1>
        {sp.done ? (
          <p
            role="status"
            className="m-0 rounded-lg bg-plate-success px-3 py-2 text-[14px] font-semibold text-plate-ink"
          >
            Опубликовано.
          </p>
        ) : null}
        <section className="rounded-2xl bg-board-row p-4">
          <PostForm
            groups={groups.map((g) => ({
              id: g.id,
              label: `${g.code} · ${g.institute.code}`,
            }))}
          />
        </section>
      </div>
      <aside className="flex flex-col gap-2 rounded-2xl bg-board-row px-4 py-4">
        <h2 className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-board-muted">
          Уже опубликовано · прочитали
        </h2>
        <ReadStats authorId={user.id} kinds={["deadline", "announcement"]} />
      </aside>
      <ConceptNote className="text-[11px] text-board-muted lg:col-span-2" />
    </main>
  );
}
