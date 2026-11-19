import { expect, test } from "@playwright/test";

test.use({ channel: "chromium" });

test("N3: сервис-воркер показывает полученное уведомление", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Доставку имитирует Chromium CDP");

  await page.goto("/login");
  const origin = new URL(page.url()).origin;
  await context.grantPermissions(["notifications"], { origin });
  const session = await context.newCDPSession(page);
  let registrationId: string | undefined;
  session.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
    const live = registrations.find(
      (registration) =>
        registration.scopeURL === origin + "/" && !registration.isDeleted,
    );
    if (live) registrationId = live.registrationId;
  });
  await session.send("ServiceWorker.enable");
  expect(await page.evaluate(() => Notification.permission)).toBe("granted");

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => registrationId).toBeTruthy();
  if (!registrationId) throw new Error("Сервис-воркер не зарегистрировался");

  await session.send("ServiceWorker.deliverPushMessage", {
    origin,
    registrationId,
    data: JSON.stringify({
      title: "Изменилось расписание",
      body: "Загляни в расписание",
      url: "/schedule",
      tag: "test-schedule",
    }),
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        const [notice] = await registration.getNotifications({
          tag: "test-schedule",
        });
        return notice
          ? { title: notice.title, url: notice.data.url as string }
          : null;
      }),
    )
    .toEqual({ title: "Изменилось расписание", url: origin + "/schedule" });
});
