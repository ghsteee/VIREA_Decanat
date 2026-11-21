"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Settings2, LogOut, Flag, UserRound } from "lucide-react";
import { logout } from "@/app/login/actions";

export type AccountSummary = {
  name: string;
  role: "staff" | "student";
  head: boolean;
  group: { code: string; course: number; institute: { code: string } } | null;
};

export function AccountMenu({ account }: { account: AccountSummary }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  return (
    <div
      ref={container}
      className="account-anchor"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
          e.stopPropagation();
        }
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="account-trigger"
        aria-label="Меню профиля"
        aria-expanded={open}
        aria-controls="account-panel"
        onClick={() => setOpen(!open)}
      >
        <span className="account-avatar">
          {account.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")}
        </span>
        <ChevronDown aria-hidden size={16} />
      </button>
      {open && (
        <section
          id="account-panel"
          className="account-panel"
          aria-label="Мой аккаунт"
        >
          <strong>{account.name}</strong>
          <p>
            {account.role === "staff"
              ? "Сотрудник дирекции"
              : account.head
                ? "Староста группы"
                : "Студент"}
            {account.group && (
              <>
                {" "}
                · {account.group.code}
                <br />
                {account.group.institute.code} · {account.group.course} курс
              </>
            )}
          </p>
          <Link href="/profile" onClick={() => setOpen(false)}>
            <UserRound />
            Профиль
          </Link>
          <Link href="/profile#thm" onClick={() => setOpen(false)}>
            <Settings2 />
            Оформление
          </Link>
          {account.head && (
            <Link href="/group-head" onClick={() => setOpen(false)}>
              <Flag />
              Кабинет старосты
            </Link>
          )}
          <form action={logout}>
            <button>
              <LogOut />
              Выйти
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
