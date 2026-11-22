import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { assistantEnabled } from "@/server/gigachat";
import { ConceptNote } from "@/components/concept-note";
import { AssistantForm } from "./assistant-form";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await requireUser();
  if (!assistantEnabled() || user.role !== "student" || !user.studentProfileId)
    notFound();
  return (
    <main className="cabinet-page flex max-w-[56rem] flex-col gap-4 bg-board p-4 text-board-text md:rounded-3xl md:p-6 lg:gap-5 lg:p-8">
      <Link
        href="/profile"
        className="flex min-h-11 items-center text-board-link"
      >
        ‹ Профиль
      </Link>
      <h1 className="m-0 font-board text-[34px] font-extrabold uppercase lg:text-[44px]">
        Помощник
      </h1>
      <p className="text-board-muted">
        Вопросы об учёбе, разделах кабинета и правилах ВТУ ВИРЭА.
      </p>
      <AssistantForm />
      <ConceptNote />
    </main>
  );
}
