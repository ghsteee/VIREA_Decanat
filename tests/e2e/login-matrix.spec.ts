import { expect, test } from "@playwright/test";

test("Фон входа реагирует на указатель и учитывает настройки движения", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.goto("/login");
  const layer = page
    .locator("svg")
    .filter({ has: page.locator("#matrix-cell") });
  await page.mouse.move(160, 180);
  await expect(layer).toHaveAttribute("data-active", "");
  await expect(layer).toHaveCSS("pointer-events", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(layer.locator("use").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.keyboard.press("Tab");
  await expect(layer).not.toHaveAttribute("data-active", "");
  await page.getByLabel("Логин", { exact: true }).click();
  await expect(page.getByLabel("Логин", { exact: true })).toBeFocused();
});
