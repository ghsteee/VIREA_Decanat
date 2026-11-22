import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { assistantEnabled } from "@/server/gigachat";
import { assistantRules } from "@/server/assistant-docs";
import { sectionAnchor } from "@/server/assistant-protocol";
import { ConceptNote } from "@/components/concept-note";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const user = await requireUser();
  if (!assistantEnabled() || user.role !== "student" || !user.studentProfileId)
    notFound();
  const rules = await assistantRules();
  if (!rules) notFound();
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-4 bg-board p-4 text-board-text">
      <Link
        href="/assistant"
        className="flex min-h-11 items-center text-board-link"
      >
        ‹ Помощник
      </Link>
      <h1 className="m-0 font-board text-[30px] font-extrabold">
        {rules.title}
      </h1>
      {rules.sections.map((section) => (
        <section
          id={sectionAnchor(section.number)}
          key={section.number}
          className="scroll-mt-3 border-t border-board-line py-2"
        >
          <h2 className="font-semibold">
            Пункт {section.number}
            {section.heading ? ` · ${section.heading}` : ""}
          </h2>
          <p className="whitespace-pre-line">{section.text}</p>
        </section>
      ))}
      <ConceptNote />
    </main>
  );
}
