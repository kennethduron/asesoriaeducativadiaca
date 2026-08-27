import { describe, expect, it } from "vitest";

import { buildPublicRequestEmail } from "./public-request-email";

describe("public request email", () => {
  it("uses the DIACA subject, Honduras time and escaped content", () => {
    const result = buildPublicRequestEmail({
      name: '<script>alert("x")</script>',
      email: "synthetic@example.invalid",
      phone: null,
      service: "Asesoría académica",
      createdAt: "2026-08-27T15:00:00.000Z",
      requestUrl:
        "https://asesoriaeducativadiaca.com/admin/solicitudes/11111111-1111-4111-8111-111111111111",
    });
    expect(result.subject).toBe("Nueva solicitud recibida — DIACA");
    expect(result.html).toContain("Fecha y hora (Honduras)");
    expect(result.html).toContain("Ver solicitud");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).not.toContain('<script>alert("x")</script>');
  });
});
