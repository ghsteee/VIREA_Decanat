import "server-only";
import * as webpush from "web-push";

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};
export type PushTarget = { endpoint: string; p256dh: string; auth: string };

let configured: boolean | null = null;

/** Ключи VAPID — только из .env на сервере. Без них push просто не отправляется. */
function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  configured = Boolean(pub && priv && subject && subject !== "mailto:");
  if (configured) webpush.setVapidDetails(subject!, pub!, priv!);
  return configured;
}

export function vapidPublicKey(): string | null {
  return configure() ? process.env.VAPID_PUBLIC_KEY! : null;
}

export type SendResult = "accepted" | "gone" | "retry" | "disabled";

export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<SendResult> {
  if (!configure()) return "disabled";
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: "high" },
    );
    return "accepted";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    // 404/410 — подписка больше не существует
    if (status === 404 || status === 410) return "gone";
    return "retry";
  }
}
