import { expect, test, type Page } from "@playwright/test";

const sizes = [
  { width: 320, height: 680 },
  { width: 360, height: 640 },
  { width: 820, height: 900 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("main")).toBeVisible();
  const widths = await page.getByRole("main").evaluate((main) => ({
    actual: main.getBoundingClientRect().width,
    available: main.closest("#cabinet-content")?.clientWidth,
    viewport: document.documentElement.clientWidth,
  }));
  const expected =
    widths.available === undefined
      ? widths.viewport
      : widths.available - (widths.viewport >= 768 ? 48 : 0);
  expect(Math.abs(widths.actual - expected), path).toBeLessThanOrEqual(1);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, path).toBeLessThanOrEqual(page.viewportSize()!.width);
}

async function checkNav(page: Page, viewport: (typeof sizes)[number]) {
  const nav = page.getByRole("navigation", { name: "Разделы", exact: true });
  await expect(nav).toHaveCount(1);
  const box = (await nav.boundingBox())!;
  if (viewport.width >= 1024) {
    expect(box.x).toBe(0);
    expect(box.height).toBe(viewport.height);
  } else {
    expect(box.y).toBeGreaterThan(viewport.height / 2);
    expect(box.width).toBeLessThanOrEqual(viewport.width);
  }
}

for (const size of sizes) {
  test(`NF1: экран ${size.width} px для студента и сотрудника`, async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.setViewportSize(size);
    if (size.width === 1366) await page.emulateMedia({ colorScheme: "dark" });
    await open(page, "/login");
    const brand = (await page
      .getByRole("region", { name: "Деканыч" })
      .boundingBox())!;
    const formPanel = (await page
      .getByRole("heading", { name: "Вход", exact: true })
      .locator("../..")
      .boundingBox())!;
    await expect(
      page.getByText("Учебный прототип", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Концепт для хакатона/)).toHaveCount(0);
    if (size.width >= 1024) {
      expect(brand.y).toBe(formPanel.y);
      expect(brand.height).toBe(formPanel.height);
    } else {
      expect(formPanel.y).toBeGreaterThanOrEqual(brand.y + brand.height);
    }
    await page.getByRole("button", { name: /Студент — Данила/ }).click();
    await expect(
      page.getByRole("heading", { name: "Сегодня", exact: true }),
    ).toBeVisible();
    await checkNav(page, size);

    const board = page.getByRole("region", { name: "Сегодня", exact: true });
    const deadlines = page.getByRole("region", { name: "Дедлайны недели" });
    const boardBox = (await board.boundingBox())!;
    const deadlinesBox = (await deadlines.boundingBox())!;
    if (size.width >= 1024) {
      expect(deadlinesBox.x).toBeGreaterThanOrEqual(
        boardBox.x + boardBox.width,
      );
    } else {
      expect(deadlinesBox.y).toBeGreaterThanOrEqual(
        boardBox.y + boardBox.height,
      );
    }

    const requestsLink = page.getByRole("link", {
      name: "Все заявки",
      exact: true,
    });
    await expect(requestsLink).toHaveAttribute("href", "/requests");
    expect((await requestsLink.boundingBox())!.height).toBeGreaterThanOrEqual(
      44,
    );
    await requestsLink.focus();
    await requestsLink.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Заявки", exact: true }),
    ).toBeVisible();

    for (const path of [
      "/schedule",
      "/schedule?view=week",
      "/schedule?view=month",
      "/schedule?view=session",
      "/study",
      "/feed",
      "/requests",
      "/requests/new?type=study_certificate",
      "/profile",
    ]) {
      await open(page, path);
    }

    await open(page, "/schedule");
    const picker = (await page.locator(".schedule-picker").boundingBox())!;
    const results = (await page.locator(".schedule-results").boundingBox())!;
    expect(results.y).toBeGreaterThanOrEqual(picker.y + picker.height);
    expect(results.x).toBe(picker.x);
    expect(results.width).toBe(picker.width);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: "Уведомления", exact: true }),
    ).toBeVisible();
    for (const link of await page
      .getByRole("navigation", { name: "Дни недели" })
      .getByRole("link")
      .all()) {
      const target = (await link.boundingBox())!;
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThanOrEqual(size.width >= 360 ? 44 : 24);
    }
    await open(page, "/schedule?view=week");
    const days = page.locator(".schedule-week > section");
    await expect(days).toHaveCount(7);
    if (size.width >= 1024) {
      const [first, second] = await days.evaluateAll((elements) =>
        elements.slice(0, 2).map((element) => {
          const { x, y } = element.getBoundingClientRect();
          return { x, y };
        }),
      );
      expect(first.y).toBe(second.y);
      expect(second.x).toBeGreaterThan(first.x);
    }
    const week = page.getByRole("main");
    const box = (await week.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(
      size.width >= 1024 ? 850 : size.width >= 768 ? 640 : size.width - 10,
    );

    const staff = await browser.newPage({ baseURL, viewport: size });
    try {
      await open(staff, "/login");
      await staff.getByRole("button", { name: /Дирекция — Ирина/ }).click();
      await expect(
        staff.getByRole("heading", { name: "Очередь заявок" }),
      ).toBeVisible();
      await checkNav(staff, size);
      for (const path of [
        "/staff",
        "/staff/schedule",
        "/staff/announcements",
      ]) {
        await open(staff, path);
      }
    } finally {
      await staff.close();
    }
  });
}
