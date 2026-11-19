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
    <main className="mx-auto flex max-w-[560px] flex-col gap-4 bg-board p-4 text-board-text">
      <Link
        href="/profile"
        className="flex min-h-11 items-center text-board-link"
      >
        ‹ Профиль
      </Link>
      <h1 className="m-0 font-board text-[34px] font-extrabold uppercase">
        Помощник
      </h1>
      <p className="text-board-muted">
        Ответы по вымышленному положению ВТУ ВИРЭА. Вопрос передаётся GigaChat.
        Используй только учебные примеры без личных данных.
      </p>
      <Link
        href="/assistant/rules"
        className="flex min-h-11 items-center text-board-link"
      >
        Открыть демо-положение
      </Link>
      <AssistantForm />
      <ConceptNote />
    </main>
  );
}
