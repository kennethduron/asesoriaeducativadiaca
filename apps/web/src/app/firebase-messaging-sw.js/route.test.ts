import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("firebase messaging service worker", () => {
  it("activates updates immediately and preserves safe request routes", async () => {
    const response = GET();
    const script = await response.text();

    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('self.addEventListener("install"');
    expect(script).toContain("self.skipWaiting()");
    expect(script).toContain('self.addEventListener("activate"');
    expect(script).toContain("self.clients.claim()");
    expect(script).toContain("\\/admin\\/solicitudes\\/");
    expect(script).not.toContain('openWindow("/crm")');
  });
});
