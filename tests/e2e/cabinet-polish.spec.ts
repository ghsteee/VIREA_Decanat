import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { mskDate } from "../../src/lib/time";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
async function login(page: Page, account = /Студент — Данила/) {
  await page.goto("/login");
  await page.getByRole("button", { name: account }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test("N1: предзагрузка не читает сообщение, после открытия текст сохраняется", async ({
  page,
  browser,
  baseURL,
}) => {
  const user = await db.user.findUniqueOrThrow({
    where: { login: "d.severov" },
  });
  const staff = await db.user.findUniqueOrThrow({
    where: { login: "i.sokolova" },
  });
  const title = `Сообщение ${randomUUID()}`;
  const body = `Полный текст для повторного чтения ${randomUUID()}`;
  const announcement = await db.announcement.create({
    data: { title, body, authorId: staff.id, authorRole: "staff" },
  });
  const notice = await db.notification.create({
    data: {
      kind: "announcement",
      title,
      body,
      announcementId: announcement.id,
      eventKey: `test:${randomUUID()}`,
      recipients: { create: { userId: user.id } },
    },
    include: { recipients: true },
  });
  try {
    await login(page);
    expect((await page.request.get("/feed?f=announcements")).ok()).toBe(true);
    expect(
      (
        await db.notificationRecipient.findUniqueOrThrow({
          where: { id: notice.recipients[0].id },
        })
      ).readAt,
    ).toBeNull();
    await page.goto("/feed?f=announcements");
    await expect(page.getByText(body, { exact: true })).toBeVisible();
    await expect
      .poll(async () =>
        Boolean(
          (
            await db.notificationRecipient.findUniqueOrThrow({
              where: { id: notice.recipients[0].id },
            })
          ).readAt,
        ),
      )
      .toBe(true);
    await page.reload();
    await page.locator(".notification-stack summary").click();
    await expect(page.getByText(body, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("main").locator('img[src*="empty-notifications"]'),
    ).toHaveCount(0);
    const other = await browser.newPage({ baseURL });
    try {
      await login(other, /Студентка — Ксения/);
      await other.goto("/feed?f=announcements");
      await expect(other.getByText(body, { exact: true })).toHaveCount(0);
    } finally {
      await other.close();
    }
  } finally {
    await db.announcement.delete({ where: { id: announcement.id } });
  }
});

test("A4: завершённая заявка доступна в истории только своему студенту", async ({
  page,
  browser,
  baseURL,
}) => {
  const user = await db.user.findUniqueOrThrow({
    where: { login: "d.severov" },
    include: { studentProfile: true },
  });
  const template = await db.application.findFirstOrThrow({
    where: { studentId: user.studentProfile!.id },
  });
  const application = await db.application.create({
    data: {
      studentId: template.studentId,
      typeId: template.typeId,
      submissionGroupId: template.submissionGroupId,
      formData: template.formData as Prisma.InputJsonValue,
      profileSnapshot: template.profileSnapshot as Prisma.InputJsonValue,
      deliveryMethod: "electronic",
      status: "issued",
    },
  });
  try {
    await login(page);
    await page.goto("/requests");
    await expect(
      page.locator(`a[href="/requests/${application.id}"]`),
    ).toHaveCount(0);
    await page.getByRole("link", { name: /^История/ }).click();
    const row = page.locator(`a[href="/requests/${application.id}"]`);
    await expect(row).toContainText("выдана");
    await row.click();
    await expect(page.getByRole("main")).toBeVisible();
    const other = await browser.newPage({ baseURL });
    try {
      await login(other, /Студентка — Ксения/);
      expect((await other.goto(`/requests/${application.id}`))?.status()).toBe(
        404,
      );
    } finally {
      await other.close();
    }
  } finally {
    await db.application.delete({ where: { id: application.id } });
  }
});

test("P1 и X1: профиль без QR и длинной надписи, уведомления доступны", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  await expect(
    page.getByText(/QR на проходной|Концепт для хакатона/),
  ).toHaveCount(0);
  await expect(
    page.getByText("Учебный прототип", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Уведомления", exact: true })
    .click();
  await expect(page).toHaveURL(/\/feed$/);
});

test("P3: без настроенных каналов остаются рабочие настройки профиля и лента", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.SMTP_HOST || process.env.VAPID_PUBLIC_KEY),
    "Сценарий предназначен для среды без внешних каналов",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(
    page.getByRole("region", { name: "Деканыч" }).getByRole("button"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /анимаци/ })).toHaveCount(0);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: /Push на телефон|Письма на почту/ }),
  ).toHaveCount(0);
  await expect(page.getByText(/сейчас недоступ/)).toHaveCount(0);
  await page.getByRole("button", { name: "Тёмная", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Тёмная", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Как система", exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Уведомления" })
    .click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByText(/Важное дублируем/)).toHaveCount(0);
});

test("R4: старая демо-ссылка встречи не показывается, экспорт пары работает", async ({
  page,
}) => {
  const lesson = await db.lesson.findFirstOrThrow({
    where: { group: { code: "БИСО-03-25" }, format: "online" },
  });
  try {
    await db.lesson.update({
      where: { id: lesson.id },
      data: { onlineUrl: "https://example.org/demo-meet/english" },
    });
    await login(page);
    await page.goto(`/schedule?date=${mskDate(lesson.startsAt)}`);
    await expect(page.locator(`#lesson-${lesson.id}`)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Подключиться", exact: true }),
    ).toHaveCount(0);
    const exported = await page.request.get(`/schedule/calendar/${lesson.id}`);
    expect(exported.status()).toBe(200);
    expect(await exported.text()).toContain("BEGIN:VEVENT");
  } finally {
    await db.lesson.update({
      where: { id: lesson.id },
      data: { onlineUrl: lesson.onlineUrl },
    });
  }
});
