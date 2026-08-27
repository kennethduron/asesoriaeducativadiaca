import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  createPrivilegedClient: vi.fn(),
  sendPublicRequestEmail: vi.fn(),
  sendPublicRequestPush: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  requestSubject: () => "synthetic-ip",
}));
vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: mocks.createPrivilegedClient,
}));
vi.mock("@/lib/notifications/resend", () => ({
  sendPublicRequestEmail: mocks.sendPublicRequestEmail,
}));
vi.mock("@/lib/notifications/fcm", () => ({
  InvalidPushTokenError: class InvalidPushTokenError extends Error {},
  sendPublicRequestPush: mocks.sendPublicRequestPush,
}));
vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://asesoriaeducativadiaca.com",
}));
vi.mock("@/lib/validation/lead", () => ({
  leadSchema: {
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
}));

import { POST } from "./route";

const payload = {
  name: "Persona Sintética",
  email: "synthetic@example.invalid",
  phone: "+50499990000",
  service: "Asesoría académica",
  priority: "Normal",
  message: "Consulta controlada",
  organization_site: "",
};
const requestId = "11111111-1111-4111-8111-111111111111";
const idempotencyKey = "22222222-2222-4222-8222-222222222222";

function request(
  body: unknown,
  origin = "https://preview.example.test",
  headers: Record<string, string> = {},
) {
  return new Request("https://preview.example.test/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "idempotency-key": idempotencyKey,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function supabaseMock(deliveries: unknown[] = []) {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const rpc = vi.fn(async (name: string) => {
    if (name === "create_public_request")
      return {
        data: [
          {
            request_id: requestId,
            was_created: true,
            accepted_at: "2026-08-27T12:00:00.000Z",
            accepted_name: payload.name,
            accepted_email: payload.email,
            accepted_phone: payload.phone,
            accepted_service: payload.service,
          },
        ],
        error: null,
      };
    if (name === "claim_public_request_notifications")
      return { data: deliveries, error: null };
    return { data: null, error: null };
  });
  return { rpc, from: vi.fn(() => ({ update })), update, eq };
}

describe("public request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retry_after_seconds: 0,
    });
    mocks.sendPublicRequestEmail.mockResolvedValue("resend-message");
    mocks.sendPublicRequestPush.mockResolvedValue("fcm-message");
    mocks.createPrivilegedClient.mockReturnValue(supabaseMock());
  });

  it("rejects cross-origin requests before consuming capacity", async () => {
    expect((await POST(request(payload, "https://evil.example"))).status).toBe(
      403,
    );
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("uses a distributed limiter and returns Retry-After", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retry_after_seconds: 42,
    });
    const response = await POST(request(payload));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
  });

  it("fails closed when the limiter is unavailable", async () => {
    mocks.consumeRateLimit.mockRejectedValue(new Error("synthetic failure"));
    expect((await POST(request(payload))).status).toBe(503);
  });

  it("rejects missing idempotency keys", async () => {
    const response = await POST(
      new Request("https://preview.example.test/api/leads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://preview.example.test",
        },
        body: JSON.stringify(payload),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.createPrivilegedClient).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without persistence", async () => {
    const response = await POST(
      request({ ...payload, organization_site: "spam.example" }),
    );
    expect(response.status).toBe(201);
    expect(mocks.createPrivilegedClient).not.toHaveBeenCalled();
  });

  it("persists first and then dispatches email and push", async () => {
    const supabase = supabaseMock([
      {
        delivery_id: "email-delivery",
        channel: "email",
        recipient_user_id: "owner-id",
        recipient: "owner@example.invalid",
        token_fingerprint: null,
      },
      {
        delivery_id: "push-delivery",
        channel: "push",
        recipient_user_id: "admin-id",
        recipient: "synthetic-fcm-token",
        token_fingerprint: "token-hash",
      },
    ]);
    mocks.createPrivilegedClient.mockReturnValue(supabase);
    const response = await POST(request(payload));
    expect(response.status).toBe(201);
    expect(supabase.rpc.mock.calls[0]?.[0]).toBe("create_public_request");
    expect(supabase.rpc.mock.calls[1]?.[0]).toBe(
      "claim_public_request_notifications",
    );
    expect(mocks.sendPublicRequestEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendPublicRequestPush).toHaveBeenCalledTimes(1);
  });

  it("keeps the visitor success response when a provider fails", async () => {
    const supabase = supabaseMock([
      {
        delivery_id: "email-delivery",
        channel: "email",
        recipient_user_id: "owner-id",
        recipient: "owner@example.invalid",
        token_fingerprint: null,
      },
    ]);
    mocks.createPrivilegedClient.mockReturnValue(supabase);
    mocks.sendPublicRequestEmail.mockRejectedValue(
      new Error("synthetic provider failure"),
    );
    expect((await POST(request(payload))).status).toBe(201);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "record_public_request_notification",
      expect.objectContaining({
        delivery_status: "failed",
        failure_code: "RESEND_FAILED",
      }),
    );
  });

  it("uses persisted values when an idempotent retry body differs", async () => {
    const supabase = supabaseMock([
      {
        delivery_id: "email-delivery",
        channel: "email",
        recipient_user_id: "owner-id",
        recipient: "owner@example.invalid",
        token_fingerprint: null,
      },
    ]);
    supabase.rpc.mockImplementation(async (name: string) => {
      if (name === "create_public_request")
        return {
          data: [
            {
              request_id: requestId,
              was_created: false,
              accepted_at: "2026-08-27T12:00:00.000Z",
              accepted_name: payload.name,
              accepted_email: payload.email,
              accepted_phone: payload.phone,
              accepted_service: payload.service,
            },
          ],
          error: null,
        };
      if (name === "claim_public_request_notifications")
        return {
          data: [
            {
              delivery_id: "email-delivery",
              channel: "email",
              recipient_user_id: "owner-id",
              recipient: "owner@example.invalid",
              token_fingerprint: null,
            },
          ],
          error: null,
        };
      return { data: null, error: null };
    });
    mocks.createPrivilegedClient.mockReturnValue(supabase);

    await POST(request({ ...payload, name: "Cuerpo alterado" }));

    expect(mocks.sendPublicRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({ name: payload.name, email: payload.email }),
    );
  });

  it("does not resend when an HTTP retry finds no pending delivery", async () => {
    const supabase = supabaseMock([]);
    let claimCount = 0;
    supabase.rpc.mockImplementation(async (name: string) => {
      if (name === "create_public_request")
        return {
          data: [
            {
              request_id: requestId,
              was_created: claimCount === 0,
              accepted_at: "2026-08-27T12:00:00.000Z",
              accepted_name: payload.name,
              accepted_email: payload.email,
              accepted_phone: payload.phone,
              accepted_service: payload.service,
            },
          ],
          error: null,
        };
      if (name === "claim_public_request_notifications") {
        claimCount++;
        return {
          data:
            claimCount === 1
              ? [
                  {
                    delivery_id: "email-delivery",
                    channel: "email",
                    recipient_user_id: "owner-id",
                    recipient: "owner@example.invalid",
                    token_fingerprint: null,
                  },
                ]
              : [],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    mocks.createPrivilegedClient.mockReturnValue(supabase);
    await POST(request(payload));
    await POST(request(payload));
    expect(mocks.sendPublicRequestEmail).toHaveBeenCalledTimes(1);
  });
});
