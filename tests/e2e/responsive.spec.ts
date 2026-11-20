import { expect, test, type Page } from "@playwright/test";

const sizes = [
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
    await open(page, "/login");
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

    for (const path of [
      "/schedule",
      "/schedule?view=week",
      "/study",
      "/feed",
      "/requests",
      "/requests/new?type=study_certificate",
      "/profile",
    ]) {
      await open(page, path);
    }

    await open(page, "/schedule?view=week");
    const week = page.getByRole("main");
    const box = (await week.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(
      size.width >= 1024 ? 850 : size.width >= 768 ? 640 : 350,
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
