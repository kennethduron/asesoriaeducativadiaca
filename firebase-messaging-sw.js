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

const getNotificationUrl = (data = {}) => {
  try {
    const nestedData = data.FCM_MSG?.data || data.FCM_MSG?.notification?.data || {};
    const targetUrl = data.url || nestedData.url || data.FCM_MSG?.fcmOptions?.link || data.FCM_MSG?.notification?.click_action || "/crm";
    return new URL(targetUrl, self.location.origin).toString();
  } catch (error) {
    return new URL("/crm", self.location.origin).toString();
  }
};

const focusOrOpenCrm = async (targetUrl) => {
  if (self.clients.openWindow) {
    try {
      const openedClient = await self.clients.openWindow(targetUrl);
      if (openedClient) {
        return openedClient;
      }
    } catch (error) {
      console.info("DIACA notification openWindow fallback:", error.message);
    }
  }

  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const sameOriginClient = clients.find((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch (error) {
      return false;
    }
  });

  if (sameOriginClient) {
    if ("navigate" in sameOriginClient) {
      const navigatedClient = await sameOriginClient.navigate(targetUrl);
      if (navigatedClient) {
        return navigatedClient.focus();
      }
    }
    return sameOriginClient.focus();
  }

  return undefined;
};

const getPayloadFromPushEvent = (event) => {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch (error) {
    return {};
  }
};

const getPayloadData = (payload = {}) => payload.data || payload.webpush?.notification?.data || payload.notification?.data || {};

const hasAutoDisplayedNotification = (payload = {}) => Boolean(payload.notification || payload.webpush?.notification);

const recentlyShownNotifications = new Set();

const showDiacaNotification = (payload = {}) => {
  const notification = payload.notification || payload.webpush?.notification || {};
  const data = getPayloadData(payload);
  const notificationId = data.notificationId || `${data.title || notification.title || ""}:${data.body || notification.body || ""}:${data.url || ""}`;

  if (recentlyShownNotifications.has(notificationId)) {
    return Promise.resolve();
  }

  recentlyShownNotifications.add(notificationId);
  setTimeout(() => recentlyShownNotifications.delete(notificationId), 8000);

  const targetUrl = getNotificationUrl(data);

  return self.registration.showNotification(notification.title || data.title || "DIACA CRM", {
    body: notification.body || data.body || "Tienes una nueva solicitud pendiente.",
    icon: "/assets/favicon.svg",
    badge: "/assets/favicon.svg",
    tag: data.notificationId ? `diaca-crm-${data.notificationId}` : "diaca-crm",
    renotify: true,
    silent: false,
    timestamp: Date.now(),
    vibrate: [120, 60, 120],
    requireInteraction: true,
    actions: [{ action: "open", title: "Abrir CRM" }],
    data: {
      url: targetUrl
    }
  });
};

self.addEventListener("push", (event) => {
  const payload = getPayloadFromPushEvent(event);
  if (hasAutoDisplayedNotification(payload)) {
    return;
  }

  event.waitUntil(showDiacaNotification(payload));
});

messaging.onBackgroundMessage((payload) => {
  if (hasAutoDisplayedNotification(payload)) {
    return Promise.resolve();
  }

  return showDiacaNotification(payload);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(focusOrOpenCrm(getNotificationUrl(event.notification.data)));
});
