"use server";

import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  decryptEmail,
  emailConfigured,
  emailHmac,
  emailRecipientAllowed,
  encryptEmail,
  parseEmail,
  sendEmail,
} from "@/server/email";
import { hitRateLimit } from "@/server/rate-limit";

export type EmailActionState = { error?: string; notice?: string };

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "student" || !user.studentProfileId) notFound();
  return user.id;
}

// Смена адреса, подтверждение и отключение сериализуются для одного студента.
async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
}

export async function requestEmailCode(
  _previous: EmailActionState,
  form: FormData,
): Promise<EmailActionState> {
  const userId = await requireStudent();
  if (!emailConfigured()) return { error: "Почта сейчас недоступна." };
  const address = parseEmail(form.get("email"));
  if (!address) return { error: "Проверь адрес почты и попробуй снова." };
  if (!emailRecipientAllowed(address))
    return { error: "В демо принимаются только тестовые адреса команды." };

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const limits = await Promise.all([
    hitRateLimit(`mail-code:user:${userId}`, 3, 600),
    hitRateLimit(
      `mail-code:address:${emailHmac("rate-limit", address)}`,
      5,
      3600,
    ),
    hitRateLimit(`mail-code:ip:${emailHmac("rate-limit", ip)}`, 15, 600),
  ]);
  if (limits.some((limit) => !limit.allowed))
    return { error: "Слишком много запросов. Попробуй позже." };

  const code = String(randomInt(1_000_000)).padStart(6, "0");
  const verificationId = randomUUID();
  const created = await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const now = new Date();
    const current = await tx.emailSubscription.findFirst({
      where: { userId, revokedAt: null },
    });
    const sameAddress =
      current && decryptEmail(current.addressEncrypted, current.id) === address;
    if (sameAddress && current.verifiedAt) return false;
    if (current) {
      await tx.emailVerification.updateMany({
        where: { subscriptionId: current.id, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    let subscriptionId = current?.id;
    if (!sameAddress || !subscriptionId) {
      if (current) {
        await tx.emailSubscription.update({
          where: { id: current.id },
          data: { revokedAt: now },
        });
      }
      subscriptionId = randomUUID();
      await tx.emailSubscription.create({
        data: {
          id: subscriptionId,
          userId,
          addressEncrypted: encryptEmail(address, subscriptionId),
        },
      });
    }
    await tx.emailVerification.create({
      data: {
        id: verificationId,
        subscriptionId,
        codeHmac: emailHmac("verification", `${verificationId}:${code}`),
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      },
    });
    return true;
  });
  if (!created) return { notice: "Этот адрес уже подтверждён." };
  revalidatePath("/profile");
  if ((await sendEmail({ to: address, code })) === "accepted")
    return { notice: "Код отправлен. Проверь почту." };
  await db.emailVerification.updateMany({
    where: { id: verificationId, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return {
    error: "Письмо не отправилось. Проверь адрес и запроси код ещё раз.",
  };
}

export async function confirmEmailCode(
  _previous: EmailActionState,
  form: FormData,
): Promise<EmailActionState> {
  const userId = await requireStudent();
  if (!emailConfigured()) return { error: "Почта сейчас недоступна." };
  const code = form.get("code");
  if (typeof code !== "string" || !/^\d{6}$/.test(code))
    return { error: "Введи шесть цифр из письма." };
  const confirmed = await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const now = new Date();
    const verification = await tx.emailVerification.findFirst({
      where: {
        subscription: { userId, revokedAt: null, verifiedAt: null },
        revokedAt: null,
        usedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: MAX_ATTEMPTS },
      },
    });
    if (!verification) return false;
    const valid = timingSafeEqual(
      Buffer.from(verification.codeHmac, "hex"),
      Buffer.from(
        emailHmac("verification", `${verification.id}:${code}`),
        "hex",
      ),
    );
    await tx.emailVerification.update({
      where: { id: verification.id },
      data: valid ? { usedAt: now } : { attempts: { increment: 1 } },
    });
    if (valid) {
      await tx.emailSubscription.update({
        where: { id: verification.subscriptionId },
        data: { verifiedAt: now },
      });
    }
    return valid;
  });
  if (!confirmed)
    return {
      error:
        "Код неверный или больше не действует. Проверь письмо или запроси новый код.",
    };
  revalidatePath("/profile");
  return { notice: "Почта подтверждена. Письма включены." };
}

export async function disableEmail(
  _previous: EmailActionState,
  form: FormData,
): Promise<EmailActionState> {
  const userId = await requireStudent();
  const subscriptionId = form.get("subscriptionId");
  if (
    typeof subscriptionId !== "string" ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(subscriptionId)
  )
    return { error: "Обнови страницу." };
  const result = await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    return tx.emailSubscription.updateMany({
      where: { id: subscriptionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
  revalidatePath("/profile");
  return result.count === 1
    ? { notice: "Письма отключены." }
    : { error: "Подписка уже изменилась. Проверь настройки." };
}
