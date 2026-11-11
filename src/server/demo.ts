import "server-only";

/** Тестовые аккаунты для жюри (prisma/seed.ts). Других логинов через кнопки не открыть. */
export const DEMO_ACCOUNTS = {
  student: "d.severov",
  risk: "k.lavrova",
  head: "m.gainullin",
  staff: "i.sokolova",
} as const;

/** Кнопки входа без пароля включаются только переменной DEMO_LOGIN=on на сервере. */
export function demoLoginEnabled() {
  return process.env.DEMO_LOGIN === "on";
}
