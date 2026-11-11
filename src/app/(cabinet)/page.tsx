import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";

export default async function TodayPage() {
  const user = await requireUser();
  if (user.role === "staff") redirect("/staff");

  return (
    <main className="flex flex-col gap-6 px-4">
      <section className="rounded-2xl bg-board p-6">
        <h1 className="font-board text-4xl font-extrabold uppercase tracking-wide">
          Сегодня
        </h1>
        <p className="mt-2 text-text-muted">
          {user.isGroupHead ? "Ты староста группы. " : ""}Экран «Сегодня»
          появится на этапе 4.
        </p>
      </section>
    </main>
  );
}
