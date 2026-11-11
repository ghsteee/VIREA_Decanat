import "server-only";
import { hash, verify } from "@node-rs/argon2";

// argon2id, параметры по рекомендации OWASP: 19 МиБ памяти, 2 прохода, 1 поток.
// Алгоритм 2 = argon2id в @node-rs/argon2.
const OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Хэш для пустой проверки, когда логина нет: ответ занимает столько же времени,
// и по задержке нельзя узнать, существует ли логин.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("dekanych-timing-guard");
  await verifyPassword(await dummyHash, password);
}

/** Логин сравниваем в нижнем регистре и без пробелов по краям. */
export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}
