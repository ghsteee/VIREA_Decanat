"use client";

import { useActionState, useState } from "react";
import { publishPost, updateLesson } from "@/app/(cabinet)/staff/actions";

import type { FormState } from "@/server/publications";
type PublicationAction = (
  state: FormState,
  form: FormData,
) => Promise<FormState>;

const input =
  "h-11 w-full rounded-[10px] border border-board-line bg-surface px-3 text-[15px] text-text";
const label = "flex flex-col gap-1.5 text-[13px] text-board-muted";
const PAIR_STARTS = ["09:00", "10:40", "12:40", "14:20", "16:20", "18:00"];

export function LessonForm(props: {
  lessonId: string;
  version: number;
  date: string;
  pair: number;
  roomId: string;
  format: "offline" | "online";
  onlineUrl: string;
  rooms: { id: string; label: string }[];
  publishAction?: PublicationAction;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    props.publishAction ?? updateLesson,
    {},
  );
  const [format, setFormat] = useState(props.format);
  const [cancel, setCancel] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="lessonId" value={props.lessonId} />
      <input type="hidden" name="version" value={props.version} />
      <fieldset
        disabled={cancel}
        className="m-0 grid grid-cols-2 gap-3 border-0 p-0 disabled:opacity-50"
      >
        <label className={label}>
          Дата
          <input
            type="date"
            name="date"
            defaultValue={props.date}
            className={input}
            required
          />
        </label>
        <label className={label}>
          Пара
          <select name="pair" defaultValue={props.pair} className={input}>
            {PAIR_STARTS.map((t, i) => (
              <option key={t} value={i + 1}>
                {i + 1}-я · {t}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="col-span-2 m-0 flex gap-4 border-0 p-0">
          <legend className="mb-1.5 text-[13px] text-board-muted">
            Формат
          </legend>
          {(["offline", "online"] as const).map((f) => (
            <label
              key={f}
              className="flex min-h-11 items-center gap-2 text-[15px]"
            >
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
                className="size-5 accent-primary"
              />
              {f === "offline" ? "Очно" : "Онлайн"}
            </label>
          ))}
        </fieldset>
        {format === "offline" ? (
          <label className={`${label} col-span-2`}>
            Аудитория
            <select name="roomId" defaultValue={props.roomId} className={input}>
              {props.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className={`${label} col-span-2`}>
            Ссылка на встречу
            <input
              type="url"
              name="onlineUrl"
              defaultValue={props.onlineUrl}
              placeholder="https://…"
              className={input}
            />
          </label>
        )}
      </fieldset>
      <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
        <input
          type="checkbox"
          name="cancel"
          checked={cancel}
          onChange={(e) => setCancel(e.target.checked)}
          className="size-5 accent-primary"
        />
        Отменить пару
      </label>
      <label className={label}>
        Причина — коротко, студенты увидят
        <input
          name="reason"
          maxLength={200}
          required
          className={input}
          placeholder="Преподаватель на конференции"
        />
      </label>
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
        className="h-12 rounded-xl bg-action font-semibold text-on-action disabled:opacity-60"
      >
        {pending
          ? "Публикуем…"
          : cancel
            ? "Отменить и уведомить"
            : "Опубликовать изменение"}
      </button>
      <p className="m-0 text-[12.5px] text-board-muted">
        Уведомление получит вся группа: в ленте сразу, push и письмо — по их
        настройкам.
      </p>
    </form>
  );
}

export function PostForm({
  groups,
  publishAction = publishPost,
}: {
  groups?: { id: string; label: string }[];
  publishAction?: PublicationAction;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    publishAction,
    {},
  );
  const [type, setType] = useState<"deadline" | "announcement">("deadline");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Что публикуешь" className="flex gap-2">
        {(["deadline", "announcement"] as const).map((t) => (
          <label
            key={t}
            className={`flex min-h-11 cursor-pointer items-center rounded-full px-3.5 text-[13.5px] font-semibold focus-within:ring-2 focus-within:ring-board-link ${type === t ? "" : "bg-board text-board-text"}`}
            style={
              type === t
                ? { background: "var(--board-text)", color: "var(--board)" }
                : undefined
            }
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="sr-only"
            />
            {t === "deadline" ? "Дедлайн" : "Объявление"}
          </label>
        ))}
      </div>
      <label className={label}>
        {type === "deadline" ? "Что сдать" : "Заголовок"}
        <input name="title" maxLength={120} required className={input} />
      </label>
      {type === "deadline" ? (
        <label className={label}>
          Срок
          <input
            type="datetime-local"
            name="dueAt"
            required
            className={input}
          />
        </label>
      ) : null}
      <label className={label}>
        {type === "deadline" ? "Подробности (необязательно)" : "Текст"}
        <textarea
          name="body"
          maxLength={1000}
          rows={3}
          className="w-full rounded-[10px] border border-board-line bg-surface p-3 text-[15px] text-text"
        />
      </label>
      {groups && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1.5 text-[13px] text-board-muted">
            Группы
          </legend>
          <div className="flex flex-wrap gap-x-4">
            {groups.map((g) => (
              <label
                key={g.id}
                className="flex min-h-11 items-center gap-2 text-[15px]"
              >
                <input
                  type="checkbox"
                  name="groups"
                  value={g.id}
                  className="size-5 accent-primary"
                />
                {g.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
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
        className="h-12 rounded-xl bg-action font-semibold text-on-action disabled:opacity-60"
      >
        {pending ? "Публикуем…" : "Опубликовать"}
      </button>
      {type === "deadline" ? (
        <p className="m-0 text-[12.5px] text-board-muted">
          Напомним студентам за 3 дня и за 1 день до срока.
        </p>
      ) : null}
    </form>
  );
}
