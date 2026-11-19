import { ECDH } from "node:crypto";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export function pushEndpoint(value: unknown): URL | null {
  if (typeof value !== "string" || value.length >= 1000) return null;
  // URL normalizes backslashes and whitespace; accept only an unambiguous input.
  if (!value.startsWith("https://") || /[\s\\#]/.test(value)) return null;

  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.port ||
      (url.pathname === "/" && !url.search)
    )
      return null;
    const host = url.hostname;
    if (
      host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com")
    )
      return url;
  } catch {
    return null;
  }
  return null;
}

function decodeKey(value: unknown, length: number): Buffer | null {
  if (typeof value !== "string" || value.length > 100) return null;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length === length && decoded.toString("base64url") === value
    ? decoded
    : null;
}

export function parsePushTarget(
  value:
    | {
        endpoint?: unknown;
        p256dh?: unknown;
        auth?: unknown;
      }
    | null
    | undefined,
): PushTarget | null {
  const url = pushEndpoint(value?.endpoint);
  const publicKey = decodeKey(value?.p256dh, 65);
  const auth = decodeKey(value?.auth, 16);
  if (!url || !publicKey || publicKey[0] !== 4 || !auth) return null;
  try {
    ECDH.convertKey(publicKey, "prime256v1");
  } catch {
    return null;
  }
  return {
    endpoint: url.href,
    p256dh: publicKey.toString("base64url"),
    auth: auth.toString("base64url"),
  };
}
