"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="cabinet-page flex flex-col items-start gap-4 rounded-3xl bg-surface p-6 md:p-8">
      <h1 className="font-board text-3xl font-extrabold uppercase">
        Не удалось открыть раздел
      </h1>
      <p className="max-w-prose text-text-muted">
        Попробуй ещё раз. Если ошибка повторится, вернись на главный экран.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-action px-4 font-semibold text-on-action"
        >
          <RefreshCw size={18} aria-hidden />
          Повторить
        </button>
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-xl border border-border-strong px-4 font-semibold no-underline"
        >
          На главный экран
        </Link>
      </div>
    </main>
  );
}
