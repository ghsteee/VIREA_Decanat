import { expect, test } from "@playwright/test";

test("Сияние входа ставится на паузу и учитывает уменьшение движения", async ({
  page,
}) => {
  await page.goto("/login");
  const panel = page.getByRole("region", { name: "Деканыч" });
  const progress = () =>
    panel
      .locator(".brand-aurora-band")
      .first()
      .evaluate((band) => getComputedStyle(band).translate);
  const initial = await progress();
  await expect.poll(progress).not.toBe(initial);
  await panel.getByRole("button", { name: "Приостановить анимацию" }).click();
  await page.waitForTimeout(50);
  const frozen = await progress();
  await page.waitForTimeout(180);
  expect(await progress()).toBe(frozen);
  await panel.getByRole("button", { name: "Включить анимацию" }).click();
  await expect.poll(progress).not.toBe(frozen);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panel.getByRole("button")).toHaveCount(0);
  await page.waitForTimeout(120);
  const still = await progress();
  await page.waitForTimeout(180);
  expect(await progress()).toBe(still);
});
