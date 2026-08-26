export const dynamic = "force-dynamic";

function javascriptString(value: string | undefined) {
  return JSON.stringify(value ?? "").replace(/</g, "\\u003c");
}

export function GET() {
  const body = `
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
const safeRoute=(data={})=>typeof data.route==="string"&&data.route.startsWith("/admin/tareas/")?data.route:"/admin/tareas";
messaging.onBackgroundMessage((payload)=>self.registration.showNotification(payload.data?.title||"Recordatorio DIACA",{body:payload.data?.body||"Tiene una tarea pendiente.",icon:"/assets/favicon-192.png",badge:"/assets/favicon-96.png",tag:payload.data?.task_id?"diaca-task-"+payload.data.task_id:"diaca-task",data:{route:safeRoute(payload.data)}}));
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
