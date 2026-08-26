import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetPasswordForEmail, consumeRateLimit } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "192.0.2.10" }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/safe-redirect", () => ({
  toSafeInternalPath: (_value: string | undefined, fallback: string) =>
    fallback,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { resetPasswordForEmail } }),
}));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit,
  requestSubject: () => "synthetic-ip",
}));
vi.mock("@/lib/site-url", () => ({
  getAbsoluteUrl: (path: string) => `https://preview.example.test${path}`,
}));

import { requestPasswordReset } from "./actions";

function form(email: string) {
  const data = new FormData();
  data.set("email", email);
  return data;
}

describe("password reset request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimit.mockResolvedValue({ allowed: true });
    resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("returns the same non-enumerating response on provider success or failure", async () => {
    const success = await requestPasswordReset(
      {},
      form("known@example.invalid"),
    );
    resetPasswordForEmail.mockRejectedValue(
      new Error("synthetic provider failure"),
    );
    const failure = await requestPasswordReset(
      {},
      form("unknown@example.invalid"),
    );
    expect(success).toEqual(failure);
    expect(success.status).toBe("success");
  });

  it("does not contact the provider after the distributed limit is reached", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false });
    const response = await requestPasswordReset(
      {},
      form("limited@example.invalid"),
    );
    expect(response.status).toBe("success");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("uses an allowlisted callback destination", async () => {
    await requestPasswordReset({}, form("known@example.invalid"));
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "known@example.invalid",
      {
        redirectTo:
          "https://preview.example.test/auth/callback?next=/restablecer-contrasena",
      },
    );
  });
});
