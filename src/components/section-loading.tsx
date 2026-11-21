export default function SectionLoading() {
  return (
    <div
      className="cabinet-page space-y-5 px-4 py-6"
      role="status"
      aria-label="Загружаем раздел"
    >
      <span className="sr-only">Загружаем раздел…</span>
      <div className="h-10 w-40 rounded-xl bg-surface-muted" />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]" aria-hidden>
        <div className="h-72 rounded-3xl bg-surface-muted" />
        <div className="h-52 rounded-3xl bg-surface-muted" />
      </div>
    </div>
  );
}
