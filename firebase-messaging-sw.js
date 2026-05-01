self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDeNqk2hLrMO_apCLD-zxpm6PhXNwv17UE",
  authDomain: "asesoriaeducativadiaca-d00a4.firebaseapp.com",
  projectId: "asesoriaeducativadiaca-d00a4",
  messagingSenderId: "71492667338",
  appId: "1:71492667338:web:f3871cc81a80e467c77133"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(notification.title || "DIACA CRM", {
    body: notification.body || data.body || "Tienes una nueva solicitud pendiente.",
    icon: "/assets/favicon.svg",
    badge: "/assets/favicon.svg",
    tag: "diaca-crm",
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || "/crm.html"
    }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/crm.html", self.location.origin).toString();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes("/crm.html"));
      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
