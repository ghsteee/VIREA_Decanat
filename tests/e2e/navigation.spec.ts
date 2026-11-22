import { expect, test } from "@playwright/test";

test("Верхнее меню, профиль, тема и прочитанные уведомления", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/login");
  await page.getByRole("button", { name: /Студент — Данила/ }).click();
  await page.waitForURL("/");
  const nav = page.getByRole("navigation", { name: "Разделы" });
  const trigger = page.getByRole("button", { name: "Меню профиля" });
  await trigger.click();
  const menu = page.getByRole("region", { name: "Мой аккаунт" });
  await expect(menu).toContainText("Данила");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.getByRole("link", { name: "Оформление" }).click();
  await expect(page).toHaveURL(/profile#thm$/);
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
  await nav.getByRole("link", { name: "Уведомления" }).click();
  await page.waitForURL("/feed");
  await page.reload();
  const stack = page.locator("details.notification-stack");
  await expect(stack.locator("ul")).toBeHidden();
  await stack.locator("summary").press("Enter");
  await expect(stack.locator("li").first()).toBeVisible();
  await stack.locator("summary").press("Enter");
  await expect(stack.locator("ul")).toBeHidden();
});
