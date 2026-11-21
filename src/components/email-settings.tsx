"use client";

import { useActionState } from "react";
import {
  confirmEmailCode,
  disableEmail,
  requestEmailCode,
} from "@/app/(cabinet)/profile/email-actions";
import type { EmailActionState } from "@/app/(cabinet)/profile/email-actions";

const inputStyle =
  "min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-text";
const buttonStyle =
  "min-h-11 rounded-lg bg-action px-3 font-semibold text-on-action disabled:opacity-50";

function Feedback({ state }: { state: EmailActionState }) {
  if (state.error)
    return (
      <p role="alert" className="m-0 text-sm text-danger-text">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p role="status" className="m-0 text-sm text-text-muted">
        {state.notice}
      </p>
    );
  return null;
}

export function EmailSettings({
  subscription,
}: {
  subscription: { id: string; verified: boolean } | null;
}) {
  const [request, requestAction, requesting] = useActionState(
    requestEmailCode,
    {},
  );
  const [confirm, confirmAction, confirming] = useActionState(
    confirmEmailCode,
    {},
  );
  const [disable, disableAction, disabling] = useActionState(disableEmail, {});
  const busy = requesting || confirming || disabling;

  return (
    <section
      aria-labelledby="email-settings-title"
      className="flex min-w-0 flex-col gap-2 border-t border-border py-2.5"
    >
      <h2
        id="email-settings-title"
        className="font-board text-[22px] font-extrabold uppercase"
      >
        Письма на почту
      </h2>
      <p className="m-0 break-all text-[13px] leading-[18px] text-text-muted">
        {subscription?.verified
          ? "Письма включены."
          : "Переносы, отмены и срочные дедлайны — на подтверждённую почту."}
      </p>
      <form action={requestAction} className="flex flex-col items-start gap-2">
        <label htmlFor="notification-email" className="text-sm font-semibold">
          {subscription?.verified ? "Новый адрес" : "Адрес почты"}
        </label>
        <input
          key={subscription?.id}
          id="notification-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          className={inputStyle}
        />
        <button type="submit" className={buttonStyle} disabled={busy}>
          {requesting ? "Отправляем…" : "Получить код"}
        </button>
      </form>
      <Feedback state={request} />
      {subscription && !subscription.verified && (
        <form
          action={confirmAction}
          className="flex flex-col items-start gap-2"
        >
          <label
            htmlFor="notification-email-code"
            className="text-sm font-semibold"
          >
            Код из письма
          </label>
          <input
            key={subscription.id}
            id="notification-email-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className={inputStyle}
          />
          <button type="submit" className={buttonStyle} disabled={busy}>
            {confirming ? "Проверяем…" : "Подтвердить"}
          </button>
        </form>
      )}
      <Feedback state={confirm} />
      {subscription && (
        <form action={disableAction}>
          <input type="hidden" name="subscriptionId" value={subscription.id} />
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg border border-border-strong px-3 text-sm font-semibold disabled:opacity-50"
          >
            {subscription.verified ? "Отключить письма" : "Убрать адрес"}
          </button>
        </form>
      )}
      <Feedback state={disable} />
    </section>
  );
}
