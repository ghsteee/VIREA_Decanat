import { requireStaff } from "@/server/auth/guards";
import { staffGroups } from "@/server/staff";
import { PostForm } from "@/components/staff/forms";
import { ReadStats } from "@/components/staff/read-stats";
import { demoLoginEnabled } from "@/server/demo";
import { demoReminderDeadlines, demoReminderKey } from "@/server/demo-reminder";
import { sendDemoReminder } from "./reminder-actions";
import { ConceptNote } from "@/components/concept-note";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; reminder?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const [groups, demoDeadlines] = await Promise.all([
    staffGroups(user.id),
    demoLoginEnabled() ? demoReminderDeadlines(user.id) : [],
  ]);
  const notice =
    sp.reminder === "sent"
      ? "Демо-напоминание поставлено в очередь."
      : sp.reminder === "same"
        ? "Такое демо-напоминание уже отправляли."
        : sp.reminder === "none"
          ? "Нет студентов, которым нужно напомнить об этом сроке."
          : null;

  return (
    <main className="cabinet-page flex min-h-dvh flex-col gap-5 bg-board px-4 pb-6 pt-4 text-board-text lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)] lg:items-start lg:gap-7 lg:px-8 lg:pt-7 md:rounded-3xl">
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
        {notice ? (
          <p
            role="status"
            className="rounded-lg bg-plate-success px-3 py-2 text-plate-ink"
          >
            {notice}
          </p>
        ) : null}
        {demoDeadlines.length ? (
          <section
            className="rounded-2xl bg-board-row p-4"
            aria-labelledby="demo-reminders"
          >
            <h2
              id="demo-reminders"
              className="mb-3 font-board text-xl font-bold uppercase"
            >
              Демо-напоминания
            </h2>
            <p className="text-sm text-board-muted">
              Покажи доставку сейчас. Напоминания за три дня и за день
              сохранятся.
            </p>
            <ul className="m-0 list-none p-0">
              {demoDeadlines.map((deadline) => {
                const sent = deadline.notifications.some(
                  (n) =>
                    n.eventKey ===
                    demoReminderKey(deadline.id, deadline.dueVersion),
                );
                return (
                  <li
                    key={deadline.id}
                    className="border-t border-board-line py-3"
                  >
                    <b>{deadline.title}</b>
                    {sent ? (
                      <p className="text-sm text-board-muted">
                        Демо-напоминание уже создано.
                      </p>
                    ) : (
                      <form action={sendDemoReminder}>
                        <input
                          type="hidden"
                          name="deadlineId"
                          value={deadline.id}
                        />
                        <button
                          type="submit"
                          className="mt-2 min-h-11 rounded-lg bg-action px-3 font-semibold text-on-action"
                        >
                          Отправить напоминание сейчас
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
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
