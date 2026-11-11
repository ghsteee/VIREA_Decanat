import { requireUser } from "@/server/auth/guards";
import { logout } from "@/app/login/actions";
import { ConceptNote } from "@/components/concept-note";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <main className="mx-auto flex max-w-[480px] flex-col">
      <section className="bg-board px-3.5 pb-5 pt-4 text-board-text">
        <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]">
          Профиль
        </h1>
        <p className="mt-2 text-[15px] text-board-muted">
          {user.displayName}
          {user.isGroupHead ? " · староста группы" : ""}
          {user.role === "staff" ? " · дирекция" : ""}
        </p>
        <p className="mt-1 text-[13px] text-board-muted">
          Студенческий, уведомления и тема появятся в задаче 4.12.
        </p>
      </section>
      <div className="flex flex-col gap-4 px-4 py-4">
        <form action={logout}>
          <button
            type="submit"
            className="h-12 w-full rounded-xl border border-border-strong bg-surface font-semibold text-danger-text"
          >
            Выйти
          </button>
        </form>
        <ConceptNote />
      </div>
    </main>
  );
}
