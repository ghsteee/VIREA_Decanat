// Сервис-воркер «Деканыча»: показывает push и открывает нужный раздел по нажатию (N3).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

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
      data: { url: data.url },
      lang: "ru",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin)
    .href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
