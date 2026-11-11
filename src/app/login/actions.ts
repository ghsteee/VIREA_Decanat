"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import {
  burnPasswordCheck,
  normalizeLogin,
  verifyPassword,
} from "@/server/auth/password";
import { createSession, revokeCurrentSession } from "@/server/auth/session";
import { hitRateLimit, resetRateLimit } from "@/server/rate-limit";

export type LoginState = { error?: string; login?: string };

const LOGIN_LIMIT = 5; // попыток на логин
const IP_LIMIT = 30; // попыток с одного адреса
const WINDOW_SEC = 15 * 60;

function minutes(sec: number) {
  return Math.max(1, Math.ceil(sec / 60));
}

export async function login(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const rawLogin = String(form.get("login") ?? "");
  const password = String(form.get("password") ?? "");
  const loginName = normalizeLogin(rawLogin);

  if (!loginName || !password) {
    return { error: "Введи логин и пароль.", login: rawLogin };
  }
  if (loginName.length > 64 || password.length > 256) {
    return { error: "Неверный логин или пароль.", login: rawLogin };
  }

  // Лимит проверяем до argon2id (docs/data-model.md)
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const byIp = await hitRateLimit(`login-ip:${ip}`, IP_LIMIT, WINDOW_SEC);
  const byLogin = await hitRateLimit(
    `login:${loginName}`,
    LOGIN_LIMIT,
    WINDOW_SEC,
  );
  if (!byIp.allowed || !byLogin.allowed) {
    const wait = Math.max(
      byIp.allowed ? 0 : byIp.retryAfterSec,
      byLogin.allowed ? 0 : byLogin.retryAfterSec,
    );
    return {
      error: `Слишком много попыток. Попробуй через ${minutes(wait)} мин.`,
      login: rawLogin,
    };
  }

  const user = await db.user.findUnique({
    where: { login: loginName },
    select: { id: true, passwordHash: true, role: true, disabledAt: true },
  });

  if (!user) {
    await burnPasswordCheck(password);
    return { error: "Неверный логин или пароль.", login: rawLogin };
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok || user.disabledAt) {
    return { error: "Неверный логин или пароль.", login: rawLogin };
  }

  await resetRateLimit(`login:${loginName}`);
  await createSession(user.id);
  redirect(user.role === "staff" ? "/staff" : "/");
}

export async function logout(): Promise<void> {
  await revokeCurrentSession();
  redirect("/login");
}
