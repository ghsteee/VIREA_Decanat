"use client";

import Link from "next/link";
import { useActionState } from "react";
import AI_Prompt from "@/components/kokonutui/ai-prompt";
import AITextLoading from "@/components/kokonutui/ai-text-loading";
import { sectionAnchor } from "@/server/assistant-protocol";
import { askAssistant, type AssistantState } from "./actions";

const loadingPhrases = ["Обдумываю вопрос", "Готовлю ответ"];

export function AssistantForm() {
  const [state, action, pending] = useActionState<AssistantState, FormData>(
    askAssistant,
    {},
  );
  return (
    <div className="flex min-w-0 flex-col gap-3 text-text">
      <AI_Prompt action={action} pending={pending} />
      {pending ? (
        <AITextLoading
          className="min-h-8 justify-start px-1 text-sm font-semibold text-text-muted"
          texts={loadingPhrases}
          label="Помощник готовит ответ"
        />
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
