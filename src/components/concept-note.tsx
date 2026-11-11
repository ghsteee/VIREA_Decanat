/** Плашка концепта (X1) — на входе и в подвале каждой страницы. */
export function ConceptNote({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-[11.5px] leading-4 text-text-muted"}>
      Концепт для хакатона. ВТУ ВИРЭА — вымышленный вуз, прообраз — РТУ МИРЭА.
      Не официальный сервис
    </p>
  );
}
