import { timingSafeEqual } from "node:crypto";

import { InvalidPushTokenError, sendTaskPush } from "@/lib/notifications/fcm";
import { sendTaskEmail } from "@/lib/notifications/resend";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const received =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateHeaders },
    );
  try {
    const supabase = createPrivilegedClient();
    const correlationId = crypto.randomUUID();
    const { data, error } = await supabase.rpc("claim_due_task_reminders", {
      batch_size: 50,
      operation_correlation_id: correlationId,
    });
    if (error) throw error;
    let sent = 0,
      failed = 0,
      skipped = 0;
    for (const item of data ?? []) {
      const recheck = async () => {
        const result = await supabase.rpc("task_reminder_still_dispatchable", {
          target_reminder_id: item.reminder_id,
        });
        return !result.error && result.data === true;
      };
      if (item.push_delivery_id) {
        if (!(await recheck())) {
          await supabase.rpc("record_task_delivery", {
            target_delivery_id: item.push_delivery_id,
            delivery_status: "cancelled",
          });
          skipped++;
        } else if (!item.push_tokens.length) {
          await supabase.rpc("record_task_delivery", {
            target_delivery_id: item.push_delivery_id,
            delivery_status: "failed",
            failure_code: "NO_ACTIVE_TOKEN",
          });
          failed++;
        } else {
          let providerId: string | null = null;
          let channelSent = false;
          for (const token of item.push_tokens)
            try {
              providerId = await sendTaskPush({
                token,
                taskId: item.task_id,
                title: item.title,
                dueAt: item.due_at,
              });
              channelSent = true;
            } catch (pushError) {
              if (pushError instanceof InvalidPushTokenError)
                await supabase
                  .from("task_push_tokens")
                  .update({ is_active: false })
                  .eq("token", token);
            }
          await supabase.rpc("record_task_delivery", {
            target_delivery_id: item.push_delivery_id,
            delivery_status: channelSent ? "sent" : "failed",
            message_id: providerId ?? undefined,
            failure_code: channelSent ? undefined : "FCM_FAILED",
          });
          if (channelSent) sent++;
          else failed++;
        }
      }
      if (item.email_delivery_id) {
        if (!(await recheck())) {
          await supabase.rpc("record_task_delivery", {
            target_delivery_id: item.email_delivery_id,
            delivery_status: "cancelled",
          });
          skipped++;
        } else
          try {
            const messageId = await sendTaskEmail({
              recipient: item.recipient_email,
              title: item.title,
              priority: item.priority,
              dueAt: item.due_at,
              taskUrl: new URL(
                `/admin/tareas/${item.task_id}`,
                getSiteUrl(),
              ).toString(),
            });
            await supabase.rpc("record_task_delivery", {
              target_delivery_id: item.email_delivery_id,
              delivery_status: "sent",
              message_id: messageId ?? undefined,
            });
            sent++;
          } catch {
            await supabase.rpc("record_task_delivery", {
              target_delivery_id: item.email_delivery_id,
              delivery_status: "failed",
              failure_code: "RESEND_FAILED",
            });
            failed++;
          }
      }
    }
    return Response.json(
      {
        ok: true,
        processed: data?.length ?? 0,
        sent,
        failed,
        skipped,
        correlation_id: correlationId,
      },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "No se pudieron procesar los recordatorios." },
      { status: 500, headers: privateHeaders },
    );
  }
}

export function GET() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: { ...privateHeaders, Allow: "POST" } },
  );
}
