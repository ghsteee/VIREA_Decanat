"use client";

import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { sectionAnchor } from "@/server/assistant-protocol";
import { askAssistant, type AssistantState } from "./actions";

const loadingPhrases = ["Сверяюсь с положением", "Готовлю ответ"];

function AnswerLoading() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setPhase((value) => (value + 1) % loadingPhrases.length),
      2300,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <p
      role="status"
      className="min-h-8 py-1.5 text-sm font-semibold text-text-muted"
    >
      <span className="sr-only">Помощник готовит ответ</span>
      <span aria-hidden className="hidden motion-reduce:inline">
        Готовлю ответ
      </span>
      <span aria-hidden className="motion-reduce:hidden">
        {Array.from(loadingPhrases[phase], (letter, index) => (
          <span
            key={phase + "-" + index}
            className="assistant-loading-letter"
            style={{ animationDelay: index * 35 + "ms" }}
          >
            {letter === " " ? "\u00a0" : letter}
          </span>
        ))}
      </span>
    </p>
  );
}

export function AssistantForm() {
  const [state, action, pending] = useActionState<AssistantState, FormData>(
    askAssistant,
    {},
  );
  return (
    <div className="flex min-w-0 flex-col gap-3 text-text">
      <form
        action={action}
        aria-busy={pending}
        className="rounded-2xl border border-border-strong bg-bg p-3 focus-within:border-primary"
      >
        <label className="sr-only" htmlFor="assistant-question">
          Твой вопрос
        </label>
        <textarea
          id="assistant-question"
          name="question"
          aria-describedby="assistant-privacy"
          maxLength={400}
          rows={2}
          required
          placeholder="Спроси про учёбу или как найти нужное в кабинете"
          className="block w-full resize-y bg-transparent px-1 py-1 text-base placeholder:text-text-muted"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2">
          <Link
            href="/assistant/rules"
            className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-primary"
          >
            Открыть демо-положение
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-action px-3.5 text-sm font-bold text-on-action disabled:opacity-60"
          >
            Спросить <ArrowUp size={17} aria-hidden />
          </button>
        </div>
        <p
          id="assistant-privacy"
          className="mt-2 text-xs leading-relaxed text-text-muted"
        >
          Вопрос передаётся GigaChat. Используй учебные примеры без личных
          данных.
        </p>
      </form>
      {pending ? (
        <AnswerLoading />
      ) : (
        (state.message || state.answer || state.draft) && (
          <section
            aria-label="Ответ помощника"
            aria-live="polite"
            className="min-w-0 rounded-xl border border-border bg-bg p-4 [overflow-wrap:anywhere]"
          >
            {state.question && (
              <p className="mb-2 text-sm text-text-muted">{state.question}</p>
            )}
            {state.kind === "study" && (
              <p className="mb-1 text-sm font-semibold text-text-muted">
                Учебное объяснение
              </p>
            )}
            <p className="whitespace-pre-line text-[15px] leading-relaxed">
              {state.answer ?? state.message}
            </p>
            {!!state.sections?.length && (
              <ul
                aria-label="Пункты демо-положения"
                className="mt-3 flex flex-wrap gap-2"
              >
                {state.sections.map((number) => (
                  <li key={number}>
                    <Link
                      className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-primary"
                      href={`/assistant/rules#${sectionAnchor(number)}`}
                    >
                      Пункт {number}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!!state.pages?.length && (
              <ul
                aria-label="Разделы кабинета"
                className="mt-3 flex flex-wrap gap-2"
              >
                {state.pages.map(({ href, title }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-primary"
                    >
                      {title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {state.draft && (
              <Link
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-action px-3 font-semibold text-on-action no-underline"
                href={`/requests/new?type=${state.draft.code}&draft=assistant`}
              >
                Проверить черновик · {state.draft.label}
              </Link>
            )}
          </section>
        )
      )}
    </div>
  );
}
