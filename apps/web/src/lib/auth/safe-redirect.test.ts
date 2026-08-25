import { describe, expect, it } from "vitest";

import { toSafeInternalPath } from "./safe-redirect";

describe("toSafeInternalPath", () => {
  it("keeps valid internal paths, queries, and fragments", () => {
    expect(toSafeInternalPath("/admin?tab=users#active")).toBe(
      "/admin?tab=users#active",
    );
  });

  it.each([
    "https://evil.example/admin",
    "//evil.example/admin",
    "/\\evil.example",
    "javascript:alert(1)",
    "admin",
    "/admin\nset-cookie:bad",
  ])("rejects unsafe redirect %s", (candidate) => {
    expect(toSafeInternalPath(candidate)).toBe("/admin");
  });

  it("supports a caller-controlled safe fallback", () => {
    expect(toSafeInternalPath(null, "/login")).toBe("/login");
  });
});
