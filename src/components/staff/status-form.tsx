"use client";

import { useActionState, useState } from "react";
import {
  changeStatus,
  type StatusState,
} from "@/app/(cabinet)/staff/requests/actions";

const LABEL: Record<string, string> = {
  in_progress: "в работе",
  ready: "готова",
  issued: "выдана",
  rejected: "отказ",
};

export function StatusForm({
  id,
  version,
  options,
  readyNote,
}: {
  id: string;
  version: number;
  options: string[];
  readyNote?: string;
}) {
  const [state, action, pending] = useActionState<StatusState, FormData>(
    changeStatus,
    {},
  );
  const [to, setTo] = useState(options[0]);
  const input =
    "h-11 w-full rounded-[10px] border border-board-line bg-surface px-3 text-[14px] text-text";
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <div
        role="radiogroup"
        aria-label="Новый статус"
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`,
        }}
      >
        {options.map((o) => (
          <label
            key={o}
            className={`flex h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] font-board text-[15px] font-bold uppercase tracking-[0.06em] ${
              to === o
                ? ""
                : o === "rejected"
                  ? "bg-board text-board-danger-text"
                  : "bg-board text-board-text"
            }`}
            style={
              to === o
                ? { background: "var(--board-text)", color: "var(--board)" }
                : undefined
            }
          >
            <input
              type="radio"
              name="to"
              value={o}
              checked={to === o}
              onChange={() => setTo(o)}
              className="sr-only"
            />
            {LABEL[o]}
          </label>
        ))}
      </div>
      {to === "ready" ? (
        <label className="flex flex-col gap-1.5 text-[13px] text-board-muted">
          Где и когда забрать — увидит студент
          <input
            name="pickup"
            defaultValue={readyNote ?? "Кабинет 214, пн–пт 10:00–17:00"}
            maxLength={200}
            className={input}
          />
        </label>
      ) : null}
      {to === "rejected" ? (
        <label className="flex flex-col gap-1.5 text-[13px] text-board-muted">
          Причина отказа — студент увидит её и сможет подать снова
          <textarea
            name="reason"
            rows={3}
            maxLength={300}
            required
            className="w-full rounded-[10px] border border-board-line bg-surface p-3 text-[14px] text-text"
          />
        </label>
      ) : null}
      {state.error ? (
        <p
          role="alert"
          className="m-0 text-[14px] font-medium text-danger-text"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[10px] bg-action font-semibold text-on-action disabled:opacity-60"
      >
        {pending ? "Сохраняем…" : "Сохранить и уведомить"}
      </button>
    </form>
  );
}
