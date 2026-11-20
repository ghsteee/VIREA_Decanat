import { createECDH, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("NF5: вход с паролем, защищённая cookie и ограничение неверных попыток", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.SEED_PASSWORD,
    "Нужна отдельная база с известным тестовому процессу паролем",
  );
  await db.rateLimitBucket.deleteMany({ where: { key: "login:d.severov" } });
  try {
    await page.goto("/login");
    await page.getByLabel("Логин", { exact: true }).fill("d.severov");
    await page
      .getByLabel("Пароль", { exact: true })
      .fill(process.env.SEED_PASSWORD!);
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    const cookie = (await context.cookies()).find(
      (value) => value.name === "dk_session",
    );
    expect(cookie).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
    await context.clearCookies();
    await page.goto("/login");
    for (let attempt = 0; attempt < 6; attempt++) {
      await page.getByLabel("Логин", { exact: true }).fill("d.severov");
      await page
        .getByLabel("Пароль", { exact: true })
        .fill(randomBytes(32).toString("hex"));
      const submitted = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/login",
      );
      await page.getByRole("button", { name: "Войти", exact: true }).click();
      await submitted;
      await expect(
        page.getByRole("button", { name: "Войти", exact: true }),
      ).toBeEnabled();
      await expect(page.locator('form [role="alert"]')).toContainText(
        attempt < 5 ? "Неверный логин или пароль" : "Слишком много попыток",
      );
    }
  } finally {
    await db.rateLimitBucket.deleteMany({ where: { key: "login:d.severov" } });
  }
});

test("N3: существующая подписка привязывается к текущему входу", async ({
  page,
}) => {
  test.skip(!process.env.VAPID_PUBLIC_KEY, "Нужны тестовые VAPID-ключи");
  const endpoint = `https://fcm.googleapis.com/fcm/send/test-${randomBytes(12).toString("hex")}`;
  const key = createECDH("prime256v1").generateKeys().toString("base64url");
  const subscription = {
    endpoint,
    keys: { p256dh: key, auth: randomBytes(16).toString("base64url") },
  };
  await page.addInitScript((value) => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "granted" },
    });
    Object.defineProperty(navigator.serviceWorker, "register", {
      configurable: true,
      value: async () => ({
        pushManager: { getSubscription: async () => ({ toJSON: () => value }) },
      }),
    });
  }, subscription);
  const danila = await db.user.findUniqueOrThrow({
    where: { login: "d.severov" },
  });
  const ksenia = await db.user.findUniqueOrThrow({
    where: { login: "k.lavrova" },
  });
  try {
    await page.goto("/login");
    await page.getByRole("button", { name: /Студент — Данила/ }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await expect
      .poll(
        async () =>
          (await db.pushSubscription.findFirst({ where: { endpoint } }))
            ?.userId,
      )
      .toBe(danila.id);
    await page.goto("/profile");
    const toggle = page.getByRole("switch", { name: "Push-уведомления" });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const initialBuckets = await db.rateLimitBucket.findMany({
      where: { key: `push-subscription:${danila.id}` },
    });
    const initialCount = initialBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0,
    );
    for (let reload = 0; reload < 3; reload++) {
      await page.reload();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
    }
    const first = await db.pushSubscription.findFirstOrThrow({
      where: { endpoint },
    });
    expect(first.userId).toBe(danila.id);
    const buckets = await db.rateLimitBucket.findMany({
      where: { key: `push-subscription:${danila.id}` },
    });
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(
      initialCount,
    );
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("button", { name: /Студентка — Ксения/ }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await expect
      .poll(
        async () =>
          (await db.pushSubscription.findUnique({ where: { id: first.id } }))
            ?.userId,
      )
      .toBe(ksenia.id);
    await page.goto("/profile");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(
      (await db.pushSubscription.findUniqueOrThrow({ where: { id: first.id } }))
        .userId,
    ).toBe(ksenia.id);
  } finally {
    await db.pushSubscription.deleteMany({ where: { endpoint } });
    await db.rateLimitBucket.deleteMany({
      where: {
        key: {
          in: [
            `push-subscription:${danila.id}`,
            `push-subscription:${ksenia.id}`,
          ],
        },
      },
    });
  }
});

test("NF7: проверка готовности доступна без раскрытия данных", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("NF1 и NF3: тема переключается клавиатурой, кнопки от 44 px", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto("/profile");
  try {
    for (const name of ["Светлая", "Тёмная", "Как система"]) {
      const box = await page
        .getByRole("button", { name, exact: true })
        .boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    const dark = page.getByRole("button", { name: "Тёмная", exact: true });
    await dark.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "docs/ai-log/screenshots/2026-11-20_06_profile-dark.jpg",
      type: "jpeg",
      quality: 85,
      fullPage: true,
    });
  } finally {
    await page
      .getByRole("button", { name: "Как система", exact: true })
      .click();
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-theme",
      "dark",
    );
  }
});
