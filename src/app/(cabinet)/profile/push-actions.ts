"use server";

import { createHash } from "node:crypto";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { parsePushTarget, pushEndpoint } from "@/server/push-subscription";
import { hitRateLimit } from "@/server/rate-limit";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

/** Сохранить подписку браузера за пользователем из сессии. */
export async function savePushSubscription(sub: Sub): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const target = parsePushTarget({
    endpoint: sub?.endpoint,
    p256dh: sub?.keys?.p256dh,
    auth: sub?.keys?.auth,
  });
  if (!target) return { ok: false };
  const endpointHash = hash(target.endpoint);
  const existing = await db.pushSubscription.findUnique({
    where: { endpointHash },
  });
  // Проверка профиля не расходует лимит повторно для уже привязанного устройства.
  if (
    existing?.userId === user.id &&
    !existing.revokedAt &&
    existing.p256dh === target.p256dh &&
    existing.auth === target.auth
  )
    return { ok: true };
  const limit = await hitRateLimit(`push-subscription:${user.id}`, 20, 3600);
  if (!limit.allowed) return { ok: false };
  await db.pushSubscription.upsert({
    where: { endpointHash },
    create: {
      userId: user.id,
      ...target,
      endpointHash,
    },
    // Тот же браузер мог раньше принадлежать другому входу — переписываем на текущего
    update: {
      userId: user.id,
      ...target,
      revokedAt: null,
    },
  });
  return { ok: true };
}

/** Отключить push в этом браузере — только свою подписку. */
export async function removePushSubscription(
  endpoint: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (typeof endpoint !== "string" || endpoint.length >= 1000)
    return { ok: false };
  const canonical = pushEndpoint(endpoint)?.href ?? endpoint;
  await db.pushSubscription.updateMany({
    where: {
      endpointHash: { in: [hash(endpoint), hash(canonical)] },
      userId: user.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}
