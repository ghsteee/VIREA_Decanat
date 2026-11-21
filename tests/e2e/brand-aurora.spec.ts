import { expect, test } from "@playwright/test";

test("Сияние реагирует на курсор без кнопки запуска и лишнего движения", async ({
  page,
}) => {
  await page.goto("/login");
  const panel = page.getByRole("region", { name: "Деканыч" });
  await expect(panel.getByRole("button")).toHaveCount(0);
  const band = panel.locator(".brand-aurora-band").first();
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
});
