import { ConceptNote } from "@/components/concept-note";

/** Временная страница раздела, который появится на этапе 4. */
export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col">
      <section className="bg-board px-3.5 pb-5 pt-4 text-board-text">
        <h1 className="m-0 font-board text-[34px] font-extrabold uppercase leading-[34px] tracking-[0.03em]">
          {title}
        </h1>
        <p className="mt-2 text-[15px] leading-[21px] text-board-muted">
          {text}
        </p>
      </section>
      <div className="px-4 py-4">
        <ConceptNote />
      </div>
    </main>
  );
}
