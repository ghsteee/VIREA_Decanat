import "server-only";
import { db } from "@/server/db";

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/**
 * Фиксированное окно на ключ (таблица RateLimitBucket).
 * Счётчик увеличивается атомарно одним запросом INSERT … ON CONFLICT.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, ${windowStart}, 1, ${expiresAt})
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"`;

  const count = rows[0]?.count ?? 1;
  return {
    allowed: count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
  };
}

/** Сбросить счётчик ключа — например, после успешного входа. */
export async function resetRateLimit(key: string): Promise<void> {
  await db.rateLimitBucket.deleteMany({ where: { key } });
}
