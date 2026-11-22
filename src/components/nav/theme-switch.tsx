"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState, useTransition } from "react";
import { setTheme } from "@/app/(cabinet)/profile/actions";

const choices = [
  { value: "light", label: "Светлая", Icon: Sun },
  { value: "dark", label: "Тёмная", Icon: Moon },
  { value: "system", label: "Как система", Icon: Monitor },
] as const;
type Theme = (typeof choices)[number]["value"];

export function ThemeSwitch({ theme }: { theme: Theme }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  function change(value: Theme, button: HTMLButtonElement) {
    if (value === theme || pending) return;
    const root = document.documentElement;
    const apply = (next: Theme) => {
      if (next === "system") delete root.dataset.theme;
      else root.dataset.theme = next;
    };
    const box = button.getBoundingClientRect();
    const x = box.left + box.width / 2,
      y = box.top + box.height / 2;
    setError(false);
    start(async () => {
      if (
        document.startViewTransition &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const transition = document.startViewTransition(() => apply(value));
        try {
          await transition.ready;
          const r = Math.hypot(
            Math.max(x, innerWidth - x),
            Math.max(y, innerHeight - y),
          );
          root.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${r}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 360,
              easing: "ease-out",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        } catch {
          apply(value);
        }
      } else apply(value);
      const data = new FormData();
      data.set("theme", value);
      try {
        await setTheme(data);
      } catch {
        apply(theme);
        setError(true);
      }
    });
  }
  return (
    <>
      <div className="theme-switch" role="group" aria-label="Тема">
        {choices.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-disabled={pending}
            aria-pressed={theme === value}
            onClick={(e) => change(value, e.currentTarget)}
          >
            <Icon size={18} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert">Не удалось сохранить тему. Попробуй ещё раз.</p>
      )}
    </>
  );
}
