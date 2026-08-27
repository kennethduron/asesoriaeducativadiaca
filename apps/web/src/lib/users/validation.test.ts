import { describe, expect, it } from "vitest";

import { inviteUserSchema, updateUserAccessSchema } from "./validation";

describe("user administration validation", () => {
  it("accepts a controlled invitation", () => {
    expect(
      inviteUserSchema.parse({
        email: "new.user@example.com",
        full_name: "New User",
        role: "finance",
      }),
    ).toEqual({
      email: "new.user@example.com",
      full_name: "New User",
      role: "finance",
    });
  });

  it("rejects a client-invented privilege", () => {
    expect(
      inviteUserSchema.safeParse({
        email: "new.user@example.com",
        full_name: "New User",
        role: "service_role",
      }).success,
    ).toBe(false);
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
