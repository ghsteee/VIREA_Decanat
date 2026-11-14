import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import nodemailer from "nodemailer";
import { demoLoginEnabled } from "@/server/demo";

function configuration() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  const domain = process.env.DOMAIN;
  const encryptionKey = Buffer.from(
    process.env.EMAIL_ENCRYPTION_KEY ?? "",
    "base64",
  );
  const codeKey = process.env.EMAIL_CODE_HMAC_KEY;
  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !user ||
    !pass ||
    !from ||
    !domain ||
    !/^[a-z0-9.-]+$/i.test(domain) ||
    encryptionKey.length !== 32 ||
    !codeKey ||
    codeKey.length < 32
  )
    return null;
  return { host, port, user, pass, from, domain, encryptionKey, codeKey };
}

export function emailConfigured() {
  return (
    configuration() !== null &&
    (!demoLoginEnabled() || testRecipients().length > 0)
  );
}

function testRecipients() {
  return (process.env.EMAIL_TEST_RECIPIENTS ?? "")
    .split(",")
    .flatMap((value) => {
      const address = parseEmail(value);
      return address ? [address] : [];
    });
}

export function emailRecipientAllowed(address: string) {
  return !demoLoginEnabled() || testRecipients().includes(address);
}

/** Только один адрес без display name, списка и управляющих символов. */
export function parseEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const address = value.trim();
  if (address.length > 254) return null;
  const [local, domain, ...rest] = address.split("@");
  if (
    rest.length ||
    !domain ||
    local.length > 64 ||
    !/^[a-z0-9_+%'-]+(?:\.[a-z0-9_+%'-]+)*$/i.test(local) ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
      domain,
    )
  )
    return null;
  return `${local}@${domain.toLowerCase()}`;
}

export function encryptEmail(address: string, subscriptionId: string): string {
  const config = configuration();
  if (!config) throw new Error("email not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", config.encryptionKey, iv);
  cipher.setAAD(Buffer.from(subscriptionId));
  const ciphertext = Buffer.concat([
    cipher.update(address, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64",
  );
}

export function decryptEmail(
  encrypted: string,
  subscriptionId: string,
): string | null {
  const config = configuration();
  if (!config) return null;
  try {
    const data = Buffer.from(encrypted, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      config.encryptionKey,
      data.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from(subscriptionId));
    decipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function emailHmac(
  purpose: "verification" | "rate-limit",
  value: string,
) {
  const config = configuration();
  if (!config) throw new Error("email not configured");
  return createHmac("sha256", config.codeKey)
    .update(`${purpose}:${value}`)
    .digest("hex");
}

type MailMessage =
  | { to: string; code: string }
  | {
      to: string;
      title: string;
      path: "/schedule" | "/feed";
      deliveryId: string;
    };

export async function sendEmail(message: MailMessage) {
  const config = configuration();
  if (!config) return "disabled";
  if (!emailRecipientAllowed(message.to)) return "rejected";
  const secure = config.port === 465;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: { user: config.user, pass: config.pass },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const mail =
      "code" in message
        ? {
            subject: "Код подтверждения почты в Деканыче",
            text: `Код подтверждения: ${message.code}\n\nВведи его в профиле. Код действует 10 минут.`,
          }
        : {
            subject: `Деканыч · ${message.title}`,
            text: `${message.title}. Подробности в кабинете:\nhttps://${config.domain}${message.path}`,
            messageId: `<${message.deliveryId}@${config.domain}>`,
          };
    const result = await transport.sendMail({
      ...mail,
      from: config.from,
      to: { address: message.to, name: "" },
    });
    return result.accepted.length === 1 ? "accepted" : "rejected";
  } catch (error) {
    const status = (error as { responseCode?: number }).responseCode;
    return status && status >= 500 && status < 600 ? "rejected" : "retry";
  }
}
