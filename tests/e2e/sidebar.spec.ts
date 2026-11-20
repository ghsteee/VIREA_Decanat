import { expect, test } from "@playwright/test";

test("Боковое меню раскрывается мышью и клавиатурой, освобождая место для подписей", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await page.waitForURL("/");
  const nav = page.getByRole("navigation", { name: "Разделы", exact: true });
  const schedule = nav.getByRole("link", { name: "Расписание", exact: true });
  const heading = page.getByRole("heading", { name: "Сегодня", exact: true });

  await expect(nav).toHaveCSS("width", "60px");
  await nav.hover({ position: { x: 25, y: 100 } });
  await expect(nav).toHaveCSS("width", "300px");
  await expect(schedule.locator("span")).toHaveCSS("opacity", "1");
  await expect
    .poll(async () => (await heading.boundingBox())!.x)
    .toBeGreaterThanOrEqual(300);
  await page.mouse.move(500, 150);
  await expect(nav).toHaveCSS("width", "60px");
  await page.keyboard.press("Tab");
  await schedule.focus();
  await expect(nav).toHaveCSS("width", "300px");
  await page.keyboard.press("Escape");
  await expect(nav).toHaveCSS("width", "60px");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(nav).toHaveCSS("transition-duration", "0s");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(schedule).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav.getByRole("link", { name: "Расписание" })).toBeVisible();
  await expect(page.getByRole("button", { name: /вернуть меню/ })).toHaveCount(
    0,
  );
});
