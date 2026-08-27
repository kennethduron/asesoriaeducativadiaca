import { NextResponse } from "next/server";
import { z } from "zod";

import {
  InvalidPushTokenError,
  sendPublicRequestPush,
} from "@/lib/notifications/fcm";
import { sendPublicRequestEmail } from "@/lib/notifications/resend";
import { consumeRateLimit, requestSubject } from "@/lib/security/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { leadSchema } from "@/lib/validation/lead";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 16 * 1024;
const idempotencySchema = z.uuid();

type CreatedRequest = {
  request_id: string;
  was_created: boolean;
  accepted_at: string;
  accepted_name: string;
  accepted_email: string;
  accepted_phone: string | null;
  accepted_service: string;
};

type NotificationDelivery = {
  delivery_id: string;
  channel: "email" | "push";
  recipient_user_id: string;
  recipient: string;
  token_fingerprint: string | null;
};

function allowedRequestOrigins(request: Request) {
  const origins = new Set([new URL(request.url).origin]);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (host) {
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      new URL(request.url).protocol.replace(":", "");
    origins.add(`${protocol}://${host}`);
  }
  return origins;
}

async function recordDelivery(
  supabase: ReturnType<typeof createPrivilegedClient>,
  deliveryId: string,
  status: "sent" | "failed",
  messageId?: string | null,
  failureCode?: string,
) {
  await supabase.rpc("record_public_request_notification", {
    target_delivery_id: deliveryId,
    delivery_status: status,
    message_id: messageId ?? undefined,
    failure_code: failureCode,
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedRequestOrigins(request).has(origin))
    return NextResponse.json(
      { error: "Solicitud no autorizada." },
      { status: 403 },
    );

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES)
    return NextResponse.json(
      { error: "La solicitud es demasiado grande." },
      { status: 413 },
    );

  try {
    const limit = await consumeRateLimit({
      scope: "public.leads",
      subject: requestSubject(request.headers),
      windowSeconds: 600,
      maxRequests: 5,
    });
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta nuevamente más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retry_after_seconds) },
        },
      );
  } catch {
    return NextResponse.json(
      { error: "El servicio no está disponible temporalmente." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Los datos de la solicitud no son válidos." },
      { status: 400 },
    );
  }
  const result = leadSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json(
      { error: "Los datos de la solicitud no son válidos." },
      { status: 400 },
    );

  if (result.data.organization_site)
    return NextResponse.json({ ok: true }, { status: 201 });

  const idempotency = idempotencySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!idempotency.success)
    return NextResponse.json(
      { error: "Los datos de la solicitud no son válidos." },
      { status: 400 },
    );

  const supabase = createPrivilegedClient();
  const correlationId = crypto.randomUUID();
  const { data, error } = await supabase.rpc("create_public_request", {
    request_idempotency_key: idempotency.data,
    request_name: result.data.name,
    request_email: result.data.email,
    request_phone: result.data.phone,
    request_service: result.data.service,
    request_priority: result.data.priority,
    request_message: result.data.message,
    operation_correlation_id: correlationId,
    request_user_agent: request.headers.get("user-agent") ?? undefined,
  });
  const created = (data as CreatedRequest[] | null)?.[0];
  if (error || !created) {
    console.error("public_request_persistence_failed", {
      code: error?.code ?? "NO_RESULT",
    });
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 500 },
    );
  }

  try {
    const claim = await supabase.rpc("claim_public_request_notifications", {
      target_request_id: created.request_id,
      operation_correlation_id: correlationId,
    });
    if (claim.error) throw claim.error;
    const deliveries = (claim.data ?? []) as NotificationDelivery[];
    const requestUrl = new URL(
      `/admin/solicitudes/${created.request_id}`,
      getSiteUrl(),
    ).toString();

    await Promise.all(
      deliveries.map(async (delivery) => {
        try {
          const messageId =
            delivery.channel === "email"
              ? await sendPublicRequestEmail({
                  recipient: delivery.recipient,
                  recipientUserId: delivery.recipient_user_id,
                  requestId: created.request_id,
                  name: created.accepted_name,
                  email: created.accepted_email,
                  phone: created.accepted_phone,
                  service: created.accepted_service,
                  createdAt: created.accepted_at,
                  requestUrl,
                })
              : await sendPublicRequestPush({
                  token: delivery.recipient,
                  requestId: created.request_id,
                  name: created.accepted_name,
                  requestUrl,
                });
          await recordDelivery(
            supabase,
            delivery.delivery_id,
            "sent",
            messageId,
          );
        } catch (notificationError) {
          if (
            delivery.channel === "push" &&
            notificationError instanceof InvalidPushTokenError &&
            delivery.token_fingerprint
          )
            await supabase
              .from("task_push_tokens")
              .update({ is_active: false })
              .eq("token_fingerprint", delivery.token_fingerprint);
          await recordDelivery(
            supabase,
            delivery.delivery_id,
            "failed",
            null,
            notificationError instanceof InvalidPushTokenError
              ? "FCM_INVALID_TOKEN"
              : delivery.channel === "email"
                ? "RESEND_FAILED"
                : "FCM_FAILED",
          );
        }
      }),
    );
  } catch {
    console.error("public_request_dispatch_setup_failed", {
      request_id: created.request_id,
    });
    await supabase.rpc("record_public_request_dispatch_failure", {
      target_request_id: created.request_id,
      operation_correlation_id: correlationId,
      failure_code: "DISPATCH_SETUP_FAILED",
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
