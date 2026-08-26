import { beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit } = vi.hoisted(() => ({ consumeRateLimit: vi.fn() }));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit,
  requestSubject: () => "synthetic-ip",
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
  message: "Consulta controlada",
  website: "",
};

function request(body: unknown, origin = "https://preview.example.test") {
  return new Request("https://preview.example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("leads proxy hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    consumeRateLimit.mockResolvedValue({
      allowed: true,
      retry_after_seconds: 0,
    });
    process.env.LEADS_API_URL = "https://legacy.example.test/api/leads";
  });

  it("rejects cross-origin requests before consuming capacity", async () => {
    expect((await POST(request(payload, "https://evil.example"))).status).toBe(
      403,
    );
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("uses a distributed limiter and returns Retry-After", async () => {
    consumeRateLimit.mockResolvedValue({
      allowed: false,
      retry_after_seconds: 42,
    });
    const response = await POST(request(payload));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
  });

  it("fails closed when the limiter is unavailable", async () => {
    consumeRateLimit.mockRejectedValue(new Error("synthetic failure"));
    expect((await POST(request(payload))).status).toBe(503);
  });

  it("forwards a validated request without exposing upstream content", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("provider details", { status: 201 }));
    const response = await POST(request(payload));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      process.env.LEADS_API_URL,
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
  });
});
