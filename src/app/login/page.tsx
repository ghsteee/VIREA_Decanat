import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "./login-form";
import { demoLogin } from "./actions";
import { demoLoginEnabled } from "@/server/demo";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = { title: "Вход — Деканыч" };

const DEMO = [
  {
    key: "student",
    title: "Студент — Данила",
    text: "1 курс, перенос пары сегодня, справка готова",
  },
  {
    key: "risk",
    title: "Студентка — Ксения",
    text: "2 курс, риск недопуска по базам данных",
  },
  {
    key: "head",
    title: "Староста — Марат",
    text: "3 курс, публикует для своей группы",
  },
  {
    key: "staff",
    title: "Дирекция — Ирина",
    text: "очередь заявок, перенос пар, объявления",
  },
] as const;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "staff" ? "/staff" : "/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <p className="px-4 pt-4 text-xs text-text-muted">
        Концепт для хакатона. ВТУ ВИРЭА — вымышленный вуз, прообраз — РТУ МИРЭА.
        Не официальный сервис
      </p>
      <section className="flex flex-col items-center gap-3 px-4 py-10">
        <BrandMark size={84} />
        <h1 className="font-board text-5xl font-extrabold uppercase tracking-wide">
          Деканыч
        </h1>
        <p className="font-board text-sm font-bold uppercase tracking-widest text-text-muted">
          Цифровой деканат ВТУ ВИРЭА
        </p>
      </section>
      <section className="rounded-t-3xl bg-surface px-4 py-6 text-text">
        <h2 className="mb-4 font-board text-2xl font-extrabold uppercase">
          Вход
        </h2>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-text-muted">
          Тестовые логины — в комментарии к работе.
        </p>
      </section>
      {demoLoginEnabled() ? (
        <section
          aria-labelledby="demo-title"
          className="flex flex-col gap-2 bg-surface px-4 pb-8 text-text"
        >
          <h2
            id="demo-title"
            className="m-0 border-t border-border pt-5 font-board text-xl font-extrabold uppercase"
          >
            Для жюри — вход без пароля
          </h2>
          <p className="m-0 mb-1 text-[13px] leading-[18px] text-text-muted">
            Все данные вымышленные. Демо каждое утро пересоздаётся.
          </p>
          {DEMO.map((d) => (
            <form key={d.key} action={demoLogin}>
              <input type="hidden" name="account" value={d.key} />
              <button
                type="submit"
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border-strong bg-surface px-3.5 py-2 text-left"
              >
                <span className="flex flex-col">
                  <b className="text-[15px]">{d.title}</b>
                  <span className="text-[12.5px] text-text-muted">
                    {d.text}
                  </span>
                </span>
                <span className="flex-none whitespace-nowrap font-board text-[15px] font-bold uppercase tracking-[0.06em] text-primary">
                  войти ›
                </span>
              </button>
            </form>
          ))}
        </section>
      ) : null}
    </main>
  );
}
