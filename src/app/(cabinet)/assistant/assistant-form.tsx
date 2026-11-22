"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sectionAnchor } from "@/server/assistant-protocol";
import { askAssistant, type AssistantState } from "./actions";

export function AssistantForm() {
  const [state, action, pending] = useActionState<AssistantState, FormData>(
    askAssistant,
    {},
  );
  return (
    <div className="flex flex-col gap-4">
      {state.question || state.message || state.sections ? (
        <section aria-live="polite" className="rounded-xl bg-board-row p-3">
          {state.question ? (
            <p className="m-0 mb-2 text-sm text-board-muted">
              Ты: {state.question}
            </p>
          ) : null}
          {state.message ? <p className="m-0">{state.message}</p> : null}
          {state.sections?.map((section) => (
            <div
              key={section.number}
              className="border-t border-board-line py-3"
            >
              <Link
                className="font-semibold text-board-link"
                href={`/assistant/rules#${sectionAnchor(section.number)}`}
              >
                Пункт {section.number}
                {section.heading ? ` · ${section.heading}` : ""}
              </Link>
              <p className="m-0 mt-2 whitespace-pre-line">{section.text}</p>
            </div>
          ))}
          {state.draft ? (
            <Link
              className="mt-3 flex min-h-11 items-center rounded-lg bg-action px-3 font-semibold text-on-action no-underline"
              href={`/requests/new?type=${state.draft.code}&draft=assistant`}
            >
              Проверить черновик · {state.draft.label}
            </Link>
          ) : null}
        </section>
      ) : null}
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          Твой вопрос
          <textarea
            name="question"
            maxLength={400}
            rows={3}
            required
            placeholder="Сколько баллов нужно для допуска?"
            className="rounded-lg border border-border bg-surface p-3 text-text"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-action px-3 font-semibold text-on-action disabled:opacity-60"
        >
          {pending ? "Ищу в положении…" : "Спросить"}
        </button>
      </form>
    </div>
  );
}
