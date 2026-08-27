import "server-only";

import { buildTaskReminderEmail } from "@/lib/notifications/task-email";
import { buildPublicRequestEmail } from "@/lib/notifications/public-request-email";

async function sendEmail(input: {
  recipient: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error("RESEND_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey
        ? { "Idempotency-Key": input.idempotencyKey }
        : {}),
    },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: input.subject,
      html: input.html,
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string };
  if (!response.ok) throw new Error(`RESEND_${response.status}`);
  return data.id ?? null;
}

export async function sendTaskEmail(input: {
  recipient: string;
  title: string;
  priority: string;
  dueAt: string;
  taskUrl: string;
}) {
  const content = buildTaskReminderEmail(input);
  return sendEmail({ recipient: input.recipient, ...content });
}

export async function sendPublicRequestEmail(input: {
  recipient: string;
  recipientUserId: string;
  requestId: string;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  createdAt: string;
  requestUrl: string;
}) {
  const content = buildPublicRequestEmail(input);
  return sendEmail({
    recipient: input.recipient,
    ...content,
    idempotencyKey: `public-request-${input.requestId}-${input.recipientUserId}`,
  });
}
