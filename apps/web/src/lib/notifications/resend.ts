import "server-only";

import { buildTaskReminderEmail } from "@/lib/notifications/task-email";

export async function sendTaskEmail(input: {
  recipient: string;
  title: string;
  priority: string;
  dueAt: string;
  taskUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error("RESEND_NOT_CONFIGURED");
  const content = buildTaskReminderEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: content.subject,
      html: content.html,
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string };
  if (!response.ok) throw new Error(`RESEND_${response.status}`);
  return data.id ?? null;
}
