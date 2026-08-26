import "server-only";

import { createSign } from "node:crypto";

const base64url = (value: string | Buffer) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

let cachedToken: { value: string; expiresAt: number } | null = null;

async function googleAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.value;
  const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("FCM_NOT_CONFIGURED");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(privateKey))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!response.ok || !data.access_token)
    throw new Error(`FCM_AUTH_${response.status}`);
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export class InvalidPushTokenError extends Error {}

export async function sendTaskPush(input: {
  token: string;
  taskId: string;
  title: string;
  dueAt: string;
}) {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) throw new Error("FCM_NOT_CONFIGURED");
  const accessToken = await googleAccessToken();
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: input.token,
          data: {
            title: "Recordatorio DIACA",
            body: `Tiene una tarea: ${input.title}`.slice(0, 240),
            task_id: input.taskId,
            route: `/admin/tareas/${input.taskId}`,
          },
          webpush: {
            headers: { TTL: "3600", Urgency: "high" },
            fcm_options: { link: `/admin/tareas/${input.taskId}` },
          },
        },
      }),
      cache: "no-store",
    },
  );
  const text = await response.text();
  if (!response.ok) {
    if (
      /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT|Requested entity was not found/i.test(
        text,
      )
    )
      throw new InvalidPushTokenError("FCM_INVALID_TOKEN");
    throw new Error(`FCM_${response.status}`);
  }
  const data = JSON.parse(text) as { name?: string };
  return data.name ?? null;
}
