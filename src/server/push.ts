import "server-only";
import { request } from "node:https";
import * as webpush from "web-push";
import { parsePushTarget, type PushTarget } from "./push-subscription";

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

let configured: boolean | null = null;

/** Ключи VAPID — только из .env на сервере. Без них push просто не отправляется. */
function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject || subject === "mailto:")
    return (configured = false);
  try {
    webpush.setVapidDetails(subject, pub, priv);
    return (configured = true);
  } catch {
    console.error("push configuration is invalid");
    return (configured = false);
  }
}

export function vapidPublicKey(): string | null {
  return configure() ? process.env.VAPID_PUBLIC_KEY! : null;
}

export type SendResult = "accepted" | "gone" | "retry" | "disabled";

export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<SendResult> {
  // Recheck on delivery so subscriptions saved before validation are also safe.
  const valid = parsePushTarget(target);
  if (!valid) return "gone";
  try {
    if (!configure()) return "disabled";
    const details = webpush.generateRequestDetails(
      {
        endpoint: valid.endpoint,
        keys: { p256dh: valid.p256dh, auth: valid.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: "high" },
    );
    // The deadline covers DNS, TLS and the response. https.request does not follow redirects.
    const status = await new Promise<number>((resolve, reject) => {
      const outgoing = request(
        valid.endpoint,
        {
          headers: details.headers,
          method: details.method,
          signal: AbortSignal.timeout(8_000),
        },
        (response) => {
          const statusCode = response.statusCode ?? 0;
          resolve(statusCode);
          response.destroy();
        },
      );
      outgoing.once("error", reject);
      outgoing.end(details.body);
    });
    if (status >= 200 && status < 300) return "accepted";
    if (status === 404 || status === 410) return "gone";
    return "retry";
  } catch {
    return "retry";
  }
}
