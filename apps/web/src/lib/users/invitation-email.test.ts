import { describe, expect, it } from "vitest";

import { buildUserInvitationEmail } from "./invitation-email";

describe("user invitation email", () => {
  it("builds a clean multipart invitation on the official domain", () => {
    const content = buildUserInvitationEmail({
      fullName: "María Ejemplo",
      roleName: "Finanzas",
      invitationUrl:
        "https://asesoriaeducativadiaca.com/aceptar-invitacion?token_hash=hash&type=invite",
    });

    expect(content.subject).toBe("Has sido invitado al sistema de DIACA");
    expect(content.text).toContain("María Ejemplo");
    expect(content.text).toContain("Finanzas");
    expect(content.html).toContain("Aceptar invitación");
    expect(content.html).toContain("asesoriaeducativadiaca.com");
    expect(content.html).not.toContain("mail.asesoriaeducativadiaca.com");
    expect(content.html).not.toContain("localhost");
  });

  it("escapes recipient-controlled values in HTML", () => {
    const content = buildUserInvitationEmail({
      fullName: '<img src=x onerror="alert(1)">',
      roleName: "Staff & Support",
      invitationUrl: "https://example.test/?a=1&b=2",
    });

    expect(content.html).not.toContain("<img");
    expect(content.html).not.toContain('onerror="');
    expect(content.html).toContain("Staff &amp; Support");
    expect(content.html).toContain("a=1&amp;b=2");
  });
});
