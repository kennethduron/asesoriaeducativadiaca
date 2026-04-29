self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "DIACA CRM",
    body: "Tienes una nueva notificacion pendiente.",
    url: "/crm.html"
  };

  const data = event.data ? event.data.json() : fallback;

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      icon: "/assets/cristian.jpg",
      data: {
        url: data.url || fallback.url
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url || "/crm.html"));
});
