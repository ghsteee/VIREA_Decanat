import { requireUser } from "@/server/auth/guards";
import { logout } from "@/app/login/actions";

// Временная оболочка кабинета (задача 3.4). Навигация и тема — задача 3.8.
export default async function CabinetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-board text-xl font-extrabold uppercase">
          Деканыч
        </span>
        <form action={logout} className="flex items-center gap-3 text-sm">
          <span className="text-text-muted">{user.displayName}</span>
          <button
            type="submit"
            className="min-h-11 rounded-xl px-3 font-semibold underline"
          >
            Выйти
          </button>
        </form>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="px-4 py-6 text-xs text-text-muted">
        Концепт для хакатона. ВТУ ВИРЭА — вымышленный вуз, прообраз — РТУ МИРЭА.
        Не официальный сервис
      </footer>
    </div>
  );
}
