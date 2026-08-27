"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
} from "firebase/messaging";

import { createClient } from "@/lib/supabase/client";

const SERVICE_WORKER_URL =
  "/firebase-messaging-sw.js?v=20260827-public-request-cta";

async function waitForActivation(registration: ServiceWorkerRegistration) {
  const worker =
    registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error("NO_SERVICE_WORKER");
  if (worker.state === "activated") return;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("SERVICE_WORKER_TIMEOUT")),
      15_000,
    );
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") {
        window.clearTimeout(timeout);
        resolve();
      } else if (worker.state === "redundant") {
        window.clearTimeout(timeout);
        reject(new Error("SERVICE_WORKER_REDUNDANT"));
      }
    });
  });
}

function firebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (Object.values(config).some((value) => !value))
    throw new Error("FCM_NOT_CONFIGURED");
  return config as Record<keyof typeof config, string>;
}

async function fingerprint(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function TaskNotifications() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  async function enable() {
    setPending(true);
    setMessage("");
    try {
      if (!(await isSupported())) throw new Error("UNSUPPORTED");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(
          "Las notificaciones no fueron autorizadas en este dispositivo.",
        );
        return;
      }
      const existing = await navigator.serviceWorker.getRegistration("/");
      if (existing && !existing.active?.scriptURL.endsWith(SERVICE_WORKER_URL))
        await existing.unregister();
      const registration = await navigator.serviceWorker.register(
        SERVICE_WORKER_URL,
        { scope: "/", updateViaCache: "none" },
      );
      await registration.update();
      await waitForActivation(registration);
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig());
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (!token) throw new Error("NO_TOKEN");
      const tokenHash = await fingerprint(token);
      const supabase = createClient();
      const { error } = await supabase.rpc("register_task_push_token", {
        token_value: token,
        token_hash: tokenHash,
        agent: navigator.userAgent.slice(0, 400),
      });
      if (error) throw error;
      setActiveToken(token);
      setMessage("Notificaciones activadas para este dispositivo.");
    } catch {
      setMessage(
        "No fue posible activar las notificaciones. Revisa la configuración del dispositivo.",
      );
    } finally {
      setPending(false);
    }
  }
  async function disable() {
    setPending(true);
    setMessage("");
    try {
      if (!activeToken) {
        setMessage("No hay un token activado durante esta sesión.");
        return;
      }
      const tokenHash = await fingerprint(activeToken);
      const supabase = createClient();
      const { error } = await supabase
        .from("task_push_tokens")
        .delete()
        .eq("token_fingerprint", tokenHash);
      if (error) throw error;
      if (await isSupported())
        await deleteToken(
          getMessaging(
            getApps().length ? getApp() : initializeApp(firebaseConfig()),
          ),
        );
      setActiveToken(null);
      setMessage("Notificaciones desactivadas en este dispositivo.");
    } catch {
      setMessage("No fue posible desactivar el dispositivo.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={enable}
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700"
      >
        <Bell className="size-4" /> Activar avisos
      </button>
      {activeToken ? (
        <button
          type="button"
          onClick={disable}
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700"
        >
          <BellOff className="size-4" /> Desactivar
        </button>
      ) : null}
      {message ? (
        <p role="status" className="w-full text-sm text-slate-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
