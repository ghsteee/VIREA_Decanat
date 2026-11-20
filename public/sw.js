// Сервис-воркер «Деканыча»: показывает push и открывает нужный раздел по нажатию (N3).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

function notificationUrl(value) {
  if (typeof value === "string") {
    try {
      const url = new URL(value, self.location.origin);
      if (url.origin === self.location.origin) return url.href;
    } catch {
      // Если ссылка потерялась, открываем ленту.
    }
  }
  return new URL("/feed", self.location.origin).href;
}

self.addEventListener("push", (event) => {
  let data = { title: "Деканыч", body: "", url: "/feed", tag: undefined };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // пустой или нестандартный push — покажем общий текст
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/brand/icon-192.png",
      badge: "/brand/favicon-32.png",
      data: { url: notificationUrl(data.url) },
      lang: "ru",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = notificationUrl(event.notification.data?.url);
  event.waitUntil(openNotification(url));
});

async function openNotification(url) {
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of windows) {
    if (new URL(client.url).origin !== self.location.origin) continue;
    try {
      const target = client.url === url ? client : await client.navigate(url);
      if (target) return await target.focus();
    } catch {
      // Вкладка могла закрыться, пока обрабатывался клик.
    }
  }
  return self.clients.openWindow(url);
}
