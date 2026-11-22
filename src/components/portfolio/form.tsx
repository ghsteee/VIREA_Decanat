"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  savePortfolio,
  deletePortfolio,
  deletePortfolioFile,
} from "@/app/(cabinet)/study/portfolio/actions";
import { AWARD_LABELS, PORTFOLIO_LABELS } from "@/lib/portfolio";

const input =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-surface px-3 py-2 text-text";
const label = "flex min-w-0 flex-col gap-1.5 text-sm font-semibold";
export function PortfolioForm({
  initial,
}: {
  initial?: {
    id: string;
    kind: keyof typeof PORTFOLIO_LABELS;
    title: string;
    award: string | null;
    eventName: string | null;
    description: string;
    date: string;
    projectUrl: string | null;
  };
}) {
  const [state, action, pending] = useActionState(savePortfolio, {});
  const [kind, setKind] = useState(initial?.kind ?? "work");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (state.location) window.location.assign(state.location);
  }, [state.location]);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const preventReset = (event: Event) => event.preventDefault();
    form.addEventListener("reset", preventReset);
    setReady(true);
    return () => form.removeEventListener("reset", preventReset);
  }, []);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      <label className={label}>
        Вид достижения
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className={input}
        >
          {Object.entries(PORTFOLIO_LABELS).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Дата
        <input
          type="date"
          name="date"
          defaultValue={initial?.date ?? ""}
          className={input}
        />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Название
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={initial?.title ?? ""}
          placeholder="Название проекта, сертификата или награды"
          className={input}
        />
      </label>
      <label className={label}>
        Хакатон или мероприятие{kind === "work" ? " (необязательно)" : ""}
        <input
          name="eventName"
          maxLength={120}
          required={kind !== "work"}
          defaultValue={initial?.eventName ?? ""}
          className={input}
        />
      </label>
      {kind === "award" ? (
        <label className={label}>
          Результат
          <select
            name="award"
            defaultValue={initial?.award ?? "winner"}
            className={input}
          >
            {Object.entries(AWARD_LABELS).map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className={label}>
          Ссылка на работу (необязательно)
          <input
            type="url"
            name="projectUrl"
            maxLength={500}
            placeholder="https://…"
            defaultValue={initial?.projectUrl ?? ""}
            className={input}
          />
        </label>
      )}
      <label className={`${label} sm:col-span-2`}>
        Описание
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={initial?.description ?? ""}
          placeholder="Что ты сделал, какая была роль в команде и чего удалось добиться"
          className={`${input} resize-y`}
        />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Работы и подтверждения
        <input
          type="file"
          name="files"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.zip,.docx,.txt"
          className={`${input} file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-board file:px-3 file:text-board-text`}
        />
        <span className="text-xs font-normal text-text-muted">
          До 5 файлов на запись, каждый до 5 МБ. PDF, JPG, PNG, WEBP, ZIP, DOCX
          или TXT. Всего в портфолио — до 50 МБ.
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger-text sm:col-span-2">
          {state.error}
        </p>
      )}
      <button
        disabled={pending || !ready}
        type="submit"
        className="min-h-11 rounded-xl bg-action px-5 py-3 font-semibold text-on-action disabled:opacity-60 sm:col-span-2"
      >
        {pending
          ? "Сохраняем…"
          : initial
            ? "Сохранить изменения"
            : "Добавить в портфолио"}
      </button>
    </form>
  );
}

export function DeletePortfolioForm({
  id,
  file = false,
}: {
  id: string;
  file?: boolean;
}) {
  const [state, action, pending] = useActionState(
    file ? deletePortfolioFile : deletePortfolio,
    {},
  );
  useEffect(() => {
    if (state.location) window.location.assign(state.location);
  }, [state.location]);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            file ? "Удалить этот файл?" : "Удалить запись и все её файлы?",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        disabled={!ready || pending}
        type="submit"
        className="min-h-11 px-3 py-2 text-sm font-semibold text-danger-text"
      >
        {file ? "Удалить файл" : "Удалить запись"}
      </button>
    </form>
  );
}
