import { expect, test } from "@playwright/test";

test("Сияние движется само, реагирует на курсор и учитывает уменьшение движения", async ({
  page,
}) => {
  await page.goto("/login");
  const panel = page.getByRole("region", { name: "Деканыч" });
  await expect(panel.getByRole("button")).toHaveCount(0);
  const band = panel.locator(".brand-aurora-band").first();
  const transform = () =>
    band.evaluate((element) => getComputedStyle(element).transform);
  const firstFrame = await transform();
  await expect.poll(transform).not.toBe(firstFrame);
  const position = () =>
    band.evaluate((element) => getComputedStyle(element).translate);
  const initial = await position();
  const bounds = (await panel.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.9,
    bounds.y + bounds.height * 0.2,
  );
  await expect.poll(position).not.toBe(initial);
  await page.mouse.move(
    bounds.x + bounds.width + 10,
    bounds.y + bounds.height + 10,
  );
  await expect.poll(position).toBe(initial);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await position();
  await panel.hover();
  expect(await position()).toBe(reduced);
  const still = await transform();
  await page.waitForTimeout(180);
  expect(await transform()).toBe(still);
});
