"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Логин
        <input
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.login}
          required
          className="h-12 rounded-xl border border-border-strong bg-surface px-3 text-base font-normal text-text"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Пароль
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-xl border border-border-strong bg-surface px-3 text-base font-normal text-text"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-danger-text">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-action font-semibold text-on-action disabled:opacity-60"
      >
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
