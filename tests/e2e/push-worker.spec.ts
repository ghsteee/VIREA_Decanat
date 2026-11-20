import { expect, test } from "@playwright/test";

test("N3: сервис-воркер активируется в мобильном браузере", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Сценарий проверяет мобильный Chromium",
  );

  await page.goto("/login");
  const workerUrl = new URL("/sw.js", page.url()).href;
  const activeUrl = await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(activeUrl).toBe(workerUrl);
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller?.scriptURL),
    )
    .toBe(workerUrl);
});
