import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/server/db";

export const SESSION_COOKIE = "dk_session";
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 дней

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET не задан или короче 32 символов");
  }
  return secret;
}

/** В БД храним только HMAC токена; сам токен — только в cookie. */
function hashToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  role: "student" | "staff";
  /** Староста своей группы — определяется по GroupHead, не по запросу */
  isGroupHead: boolean;
  studentProfileId: string | null;
  groupId: string | null;
  displayName: string;
};

/**
 * Пользователь из серверной сессии — единственный источник userId и роли
 * (правило 3 AGENTS.md). Кешируется на время одного запроса.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          role: true,
          login: true,
          disabledAt: true,
          studentProfile: {
            select: {
              id: true,
              groupId: true,
              firstName: true,
              lastName: true,
              headOf: { select: { groupId: true } },
            },
          },
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now() ||
    session.user.disabledAt
  ) {
    return null;
  }

  const { user } = session;
  const profile = user.studentProfile;
  return {
    id: user.id,
    role: user.role,
    isGroupHead: Boolean(
      profile?.headOf && profile.headOf.groupId === profile.groupId,
    ),
    studentProfileId: profile?.id ?? null,
    groupId: profile?.groupId ?? null,
    displayName: profile
      ? `${profile.firstName} ${profile.lastName}`
      : user.login,
  };
});
