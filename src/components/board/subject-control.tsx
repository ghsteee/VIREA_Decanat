import type { SubjectStanding } from "@/server/queries/study";

const LABELS = { exam: "Экзамен", credit: "Зачёт" } as const;

export function SubjectControl({
  types,
}: {
  types: SubjectStanding["controlTypes"];
}) {
  return (
    <span className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold leading-4">
      {types.length ? (
        types.map((type) => (
          <span
            key={type}
            aria-label={`Форма контроля: ${LABELS[type]}`}
            className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary"
          >
            {LABELS[type]}
          </span>
        ))
      ) : (
        <span className="text-text-muted">Форма контроля уточняется</span>
      )}
    </span>
  );
}
