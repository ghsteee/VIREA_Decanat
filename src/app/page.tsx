export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <section className="rounded-2xl bg-board p-6">
        <h1 className="font-board text-4xl font-extrabold uppercase tracking-wide">
          Деканыч
        </h1>
        <p className="mt-2 text-text-muted">
          Цифровой деканат ВТУ ВИРЭА. Каркас приложения — экраны появятся на
          этапе 4.
        </p>
      </section>
      <p className="mt-auto text-xs text-text-muted">
        Концепт для хакатона. ВТУ ВИРЭА — вымышленный вуз, прообраз — РТУ МИРЭА.
        Не официальный сервис
      </p>
    </main>
  );
}
