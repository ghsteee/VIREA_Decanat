"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  saveSession,
  type SessionState,
} from "@/app/(cabinet)/staff/session/actions";

const input =
  "h-11 min-w-0 w-full rounded-xl border border-border bg-surface px-3 text-text";
export function SessionForm(props: {
  groupId: string;
  termId: string;
  subjectId: string;
  assessmentId?: string;
  version?: number;
  kind?: string;
  date: string;
  time: string;
  room: string;
  minDate: string;
  maxDate: string;
}) {
  const [state, action, pending] = useActionState<SessionState, FormData>(
    saveSession,
    {},
  );
  const [kind, setKind] = useState(props.kind ?? "");
  const [date, setDate] = useState(props.date);
  const [time, setTime] = useState(props.time);
  const [room, setRoom] = useState(props.room);
  const [changed, setChanged] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    // Нативный reset после server action не должен менять сохранённые поля.
    const preserveValues = (event: Event) => event.preventDefault();
    form.addEventListener("reset", preserveValues);
    return () => form.removeEventListener("reset", preserveValues);
  }, []);
  return (
    <form
      action={action}
      ref={formRef}
      onChange={() => setChanged(true)}
      onSubmit={() => setChanged(false)}
      className="grid gap-3 border-t border-border p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="groupId" value={props.groupId} />
      <input type="hidden" name="termId" value={props.termId} />
      <input type="hidden" name="subjectId" value={props.subjectId} />
      <input
        type="hidden"
        name="assessmentId"
        value={state.savedId ?? props.assessmentId ?? ""}
      />
      <input
        type="hidden"
        name="version"
        value={state.version ?? props.version ?? 1}
      />
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
        Форма контроля
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className={input}
          required
        >
          <option value="" disabled>
            Выбери форму контроля
          </option>
          <option value="exam">Экзамен</option>
          <option value="credit">Зачёт</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
        Дата
        <input
          type="date"
          name="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          min={props.minDate}
          max={props.maxDate}
          className={input}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
        Время начала (МСК)
        <input
          type="time"
          name="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className={input}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
        Аудитория
        <input
          name="room"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          maxLength={80}
          placeholder="Например, А-305"
          className={input}
        />
      </label>
      <p className="text-sm text-text-muted sm:col-span-2">
        Дату и время можно добавить позже. Сохранённые изменения сразу видны
        группе.
      </p>
      {!changed && !pending && state.error && (
        <p role="alert" className="text-sm text-danger-text sm:col-span-2">
          {state.error}
        </p>
      )}
      {!changed && !pending && !state.error && state.savedId && (
        <p role="status" className="text-sm font-semibold sm:col-span-2">
          Сохранено. Группа видит изменения.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-action px-5 py-3 font-semibold text-on-action disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
