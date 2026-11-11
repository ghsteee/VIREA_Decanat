import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход — Деканыч" };

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dekanych-mark.svg" alt="" width={84} height={84} />
        <h1 className="font-board text-5xl font-extrabold uppercase tracking-wide">
          Деканыч
        </h1>
        <p className="font-board text-sm font-bold uppercase tracking-widest text-text-muted">
          Цифровой деканат ВТУ ВИРЭА
        </p>
      </section>
      <section className="rounded-t-3xl bg-[#fffefb] px-4 py-6 text-[#1d1b18] dark:bg-[#1d1b19] dark:text-[#f3f0ea]">
        <h2 className="mb-4 font-board text-2xl font-extrabold uppercase">
          Вход
        </h2>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-text-muted">
          Тестовые логины — в комментарии к работе.
        </p>
      </section>
    </main>
  );
}
