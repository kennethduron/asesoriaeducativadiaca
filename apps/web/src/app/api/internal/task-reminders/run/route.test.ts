import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, from, sendTaskPush, sendTaskEmail } = vi.hoisted(() => {
  const rpc = vi.fn();
  const update = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  return {
    rpc,
    update,
    from: vi.fn(() => ({ update })),
    sendTaskPush: vi.fn(),
    sendTaskEmail: vi.fn(),
  };
});

vi.mock("@/lib/supabase/privileged", () => ({
  createPrivilegedClient: () => ({ rpc, from }),
}));
vi.mock("@/lib/notifications/fcm", () => ({
  InvalidPushTokenError: class InvalidPushTokenError extends Error {},
  sendTaskPush,
}));
vi.mock("@/lib/notifications/resend", () => ({ sendTaskEmail }));
vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://preview.example.test",
}));

import { GET, POST } from "./route";

const claimed = {
  reminder_id: "10000000-0000-4000-8000-000000000001",
  task_id: "10000000-0000-4000-8000-000000000002",
  title: "Seguimiento sintético",
  priority: "high",
  due_at: "2026-08-30T16:00:00.000Z",
  assigned_to: "10000000-0000-4000-8000-000000000003",
  recipient_email: "finance@example.invalid",
  push_tokens: ["synthetic-push-token-long-enough"],
  push_delivery_id: "10000000-0000-4000-8000-000000000004",
  email_delivery_id: "10000000-0000-4000-8000-000000000005",
};

function request(secret = "local-cron-secret") {
  return new Request(
    "https://preview.example.test/api/internal/task-reminders/run",
    {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    },
  );
}

describe("task reminder cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "local-cron-secret";
    sendTaskPush.mockResolvedValue("fcm-message");
    sendTaskEmail.mockResolvedValue("resend-message");
  });

  it("rejects GET and an incorrect secret without touching Supabase", async () => {
    expect((await GET()).status).toBe(405);
    const response = await POST(request("wrong-secret-value"));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("dispatches independent channels and records only opaque provider ids", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_task_reminders")
        return { data: [claimed], error: null };
      if (name === "task_reminder_still_dispatchable")
        return { data: true, error: null };
      return { data: null, error: null };
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: 1,
      sent: 2,
      failed: 0,
      skipped: 0,
    });
    expect(sendTaskPush).toHaveBeenCalledTimes(1);
    expect(sendTaskEmail).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "record_task_delivery",
      expect.objectContaining({
        target_delivery_id: claimed.push_delivery_id,
        delivery_status: "sent",
        message_id: "fcm-message",
      }),
    );
  });

  it("is replay-safe when the database claim returns no reminders", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
    expect(sendTaskPush).not.toHaveBeenCalled();
    expect(sendTaskEmail).not.toHaveBeenCalled();
  });

  it("re-checks task state immediately before every channel", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_task_reminders")
        return { data: [claimed], error: null };
      if (name === "task_reminder_still_dispatchable")
        return { data: false, error: null };
      return { data: null, error: null };
    });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({
      processed: 1,
      sent: 0,
      failed: 0,
      skipped: 2,
    });
    expect(sendTaskPush).not.toHaveBeenCalled();
    expect(sendTaskEmail).not.toHaveBeenCalled();
  });

  it("keeps email independent when push delivery fails", async () => {
    sendTaskPush.mockRejectedValue(new Error("synthetic provider failure"));
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_task_reminders")
        return { data: [claimed], error: null };
      if (name === "task_reminder_still_dispatchable")
        return { data: true, error: null };
      return { data: null, error: null };
    });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({
      processed: 1,
      sent: 1,
      failed: 1,
    });
    expect(sendTaskEmail).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "record_task_delivery",
      expect.objectContaining({
        target_delivery_id: claimed.push_delivery_id,
        delivery_status: "failed",
        failure_code: "FCM_FAILED",
      }),
    );
  });
});
