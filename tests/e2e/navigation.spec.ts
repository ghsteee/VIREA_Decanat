import { expect, test } from "@playwright/test";

test("Мобильное меню, тема, маршрут заявки и прочитанные уведомления", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await page.waitForURL("/");
  const nav = page.getByRole("navigation", { name: "Разделы", exact: true });
  await nav.getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const themes = page.getByRole("group", { name: "Тема" });
  await themes.getByRole("button", { name: "Тёмная" }).click();
  await expect(themes.getByRole("button", { name: "Тёмная" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await themes.getByRole("button", { name: "Как система" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
  await expect(
    themes.getByRole("button", { name: "Как система" }),
  ).toHaveAttribute("aria-pressed", "true");
  await nav.getByRole("link", { name: "Заявки", exact: true }).click();
  await expect(
    nav.getByRole("link", { name: "Заявки", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("list", { name: "Маршрут заявки" })
      .first()
      .locator('[aria-current="step"]'),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Уведомления", exact: true })
    .click();
  await page.waitForURL("/feed");
  await page.reload();
  const stack = page.locator("details.notification-stack");
  const summary = stack.locator("summary");
  await expect(summary).toBeVisible();
  await expect(stack.locator("ul")).toBeHidden();
  await summary.click();
  await expect(stack.locator("li").first()).toBeVisible();
  await summary.press("Space");
  await expect(stack.locator("ul")).toBeHidden();
});
