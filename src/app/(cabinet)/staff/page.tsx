import { requireStaff } from "@/server/auth/guards";

export default async function StaffPage() {
  await requireStaff();

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 pt-4">
      <section className="rounded-2xl bg-board p-6">
        <h1 className="font-board text-4xl font-extrabold uppercase tracking-wide">
          Кабинет сотрудника
        </h1>
        <p className="mt-2 text-text-muted">
          Очередь заявок и перенос пар появятся на этапе 4.
        </p>
      </section>
    </main>
  );
}
