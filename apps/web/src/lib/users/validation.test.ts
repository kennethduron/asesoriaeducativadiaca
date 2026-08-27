import { describe, expect, it } from "vitest";

import { inviteUserSchema, updateUserAccessSchema } from "./validation";

describe("user administration validation", () => {
  it("accepts a controlled invitation", () => {
    expect(
      inviteUserSchema.parse({
        email: "new.user@example.com",
        full_name: "New User",
      }),
    ).toEqual({ email: "new.user@example.com", full_name: "New User" });
  });

  it("allows only the fixed role contract", () => {
    expect(
      updateUserAccessSchema.safeParse({
        user_id: "10000000-0000-4000-8000-000000000001",
        role: "service_role",
        status: "active",
      }).success,
    ).toBe(false);
  });
});
