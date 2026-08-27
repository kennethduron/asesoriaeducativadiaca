export const dynamic = "force-dynamic";

function javascriptString(value: string | undefined) {
  return JSON.stringify(value ?? "").replace(/</g, "\\u003c");
}

export function GET() {
  const body = `
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",(event)=>event.waitUntil(self.clients.claim()));
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");
firebase.initializeApp({
  apiKey:${javascriptString(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)},
  authDomain:${javascriptString(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)},
  projectId:${javascriptString(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)},
  messagingSenderId:${javascriptString(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)},
  appId:${javascriptString(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)}
});
const messaging=firebase.messaging();
const safeRoute=(data={})=>typeof data.route==="string"&&(/^\\/admin\\/tareas\\/[0-9a-f-]{36}$/i.test(data.route)||/^\\/admin\\/solicitudes\\/[0-9a-f-]{36}$/i.test(data.route))?data.route:"/admin";
messaging.onBackgroundMessage((payload)=>self.registration.showNotification(payload.data?.title||"Aviso DIACA",{body:payload.data?.body||"Tiene una notificación pendiente.",icon:"/assets/favicon-192.png",badge:"/assets/favicon-96.png",tag:payload.data?.request_id?"diaca-request-"+payload.data.request_id:(payload.data?.task_id?"diaca-task-"+payload.data.task_id:"diaca-notification"),data:{route:safeRoute(payload.data)}}));
self.addEventListener("notificationclick",(event)=>{event.notification.close();event.waitUntil(self.clients.openWindow(safeRoute(event.notification.data)));});
`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
