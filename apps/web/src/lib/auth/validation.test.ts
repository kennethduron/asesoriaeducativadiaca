import { describe, expect, it } from "vitest";

import {
  confirmedPasswordSchema,
  loginIdentifierSchema,
  usernameSchema,
} from "./validation";

describe("authentication validation", () => {
  it("normalizes username and login identifiers case-insensitively", () => {
    expect(usernameSchema.parse(" Kenneth.Duron_08 ")).toBe("kenneth.duron_08");
    expect(loginIdentifierSchema.parse(" KENNETH ")).toBe("kenneth");
  });

  it("accepts only the documented username alphabet and length", () => {
    expect(usernameSchema.safeParse("ken").success).toBe(true);
    expect(usernameSchema.safeParse("ke nneth").success).toBe(false);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(31)).success).toBe(false);
  });

  it("accepts any password composition with at least eight characters", () => {
    for (const password of ["kenneth1", "12345678", "MiClave!"]) {
      expect(
        confirmedPasswordSchema.safeParse({
          password,
          confirmation: password,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects short and mismatched passwords with clear messages", () => {
    const short = confirmedPasswordSchema.safeParse({
      password: "1234567",
      confirmation: "1234567",
    });
    expect(short.success).toBe(false);
    if (!short.success)
      expect(short.error.issues[0]?.message).toContain("al menos 8");

    const mismatch = confirmedPasswordSchema.safeParse({
      password: "12345678",
      confirmation: "abcdefgh",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success)
      expect(mismatch.error.issues[0]?.message).toBe(
        "Las contraseñas no coinciden.",
      );
  });
});
