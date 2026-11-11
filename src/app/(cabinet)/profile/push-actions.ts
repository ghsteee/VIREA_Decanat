"use server";

import { createHash } from "node:crypto";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

function valid(sub: Sub) {
  return (
    typeof sub?.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === "string" &&
    typeof sub.keys?.auth === "string" &&
    sub.keys.p256dh.length < 200 &&
    sub.keys.auth.length < 100
  );
}

/** Сохранить подписку браузера за пользователем из сессии. */
export async function savePushSubscription(sub: Sub): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!valid(sub)) return { ok: false };
  const endpointHash = hash(sub.endpoint);
  await db.pushSubscription.upsert({
    where: { endpointHash },
    create: {
      userId: user.id,
      endpoint: sub.endpoint,
      endpointHash,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    // Тот же браузер мог раньше принадлежать другому входу — переписываем на текущего
    update: {
      userId: user.id,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
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
  if (typeof endpoint !== "string") return { ok: false };
  await db.pushSubscription.updateMany({
    where: { endpointHash: hash(endpoint), userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}
