"use client";

import { useActionState } from "react";
import {
  submitApplication,
  type SubmitState,
} from "@/app/(cabinet)/requests/actions";

type Field = {
  key: string;
  label: string;
  type: "text" | "number";
  required: boolean;
  max?: number;
};

export function ApplicationForm(props: {
  typeId: string;
  fields: Field[];
  delivery: ("pickup" | "electronic")[];
  previousId?: string;
  defaults?: Record<string, string | number>;
}) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitApplication,
    {},
  );
  const input =
    "h-12 w-full rounded-xl border border-border-strong bg-surface px-3 text-base text-text";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="typeId" value={props.typeId} />
      {props.previousId ? (
        <input type="hidden" name="previousId" value={props.previousId} />
      ) : null}
      {props.fields.map((f) => (
        <label
          key={f.key}
          className="flex flex-col gap-1.5 text-sm font-semibold"
        >
          {f.label}
          {f.required ? "" : " (необязательно)"}
          <input
            name={`f_${f.key}`}
            type={f.type === "number" ? "number" : "text"}
            min={f.type === "number" ? 1 : undefined}
            max={f.type === "number" ? (f.max ?? 10) : undefined}
            defaultValue={
              props.defaults?.[f.key] ?? (f.type === "number" ? 1 : "")
            }
            required={f.required}
            maxLength={300}
            className={`${input} font-normal`}
          />
        </label>
      ))}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Как получить</legend>
        {props.delivery.map((d, i) => (
          <label
            key={d}
            className="flex min-h-11 items-center gap-2.5 text-[15px]"
          >
            <input
              type="radio"
              name="delivery"
              value={d}
              defaultChecked={i === 0}
              className="size-5 accent-primary"
            />
            {d === "pickup"
              ? "Забрать в дирекции (кабинет 214)"
              : "Электронно — в кабинете"}
          </label>
        ))}
      </fieldset>
      {state.error ? (
        <p role="alert" className="m-0 text-sm font-medium text-danger-text">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-action font-semibold text-on-action disabled:opacity-60"
      >
        {pending ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}
