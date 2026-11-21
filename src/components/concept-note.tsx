/** Короткая метка прототипа вместо длинного пояснения в подвале. */
export function ConceptNote({ className }: { className?: string }) {
  return (
    <span className={className ?? "text-xs font-medium text-text-muted"}>
      Учебный прототип
    </span>
  );
}
