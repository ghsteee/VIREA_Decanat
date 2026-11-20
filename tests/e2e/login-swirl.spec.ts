import { expect, test } from "@playwright/test";

test("Спираль входа вращается, ставится на паузу и учитывает уменьшение движения", async ({
  page,
}) => {
  await page.goto("/login");
  const panel = page.getByRole("region", { name: "Деканыч" });
  const pixels = () =>
    panel
      .locator("canvas")
      .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  const initial = await pixels();
  await expect.poll(pixels).not.toBe(initial);
  await panel.getByRole("button", { name: "Приостановить анимацию" }).click();
  const frozen = await pixels();
  await page.waitForTimeout(180);
  expect(await pixels()).toBe(frozen);
  await panel.getByRole("button", { name: "Включить анимацию" }).click();
  await expect.poll(pixels).not.toBe(frozen);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panel.getByRole("button")).toHaveCount(0);
  await page.waitForTimeout(120);
  const still = await pixels();
  await page.waitForTimeout(180);
  expect(await pixels()).toBe(still);
});
