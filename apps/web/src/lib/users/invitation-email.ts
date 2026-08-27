const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );

export function buildUserInvitationEmail(input: {
  fullName: string;
  roleName: string;
  invitationUrl: string;
}) {
  const fullName = escapeHtml(input.fullName);
  const roleName = escapeHtml(input.roleName);
  const invitationUrl = escapeHtml(input.invitationUrl);

  return {
    subject: "Has sido invitado al sistema de DIACA",
    text: [
      `Hola ${input.fullName},`,
      "",
      "Has sido invitado a formar parte del sistema administrativo de DIACA.",
      `Tu acceso ha sido preparado con el rol: ${input.roleName}.`,
      "",
      "Para completar tu cuenta, confirma la invitación y crea tu contraseña:",
      input.invitationUrl,
      "",
      "Este enlace es personal y tiene tiempo limitado.",
      "Si no esperabas esta invitación, puedes ignorar este correo.",
      "",
      "DIACA",
      "Asesoría Educativa",
    ].join("\n"),
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0b2341">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
          <tr><td style="background:#0b2341;padding:24px 28px;border-top:5px solid #d9ad4f">
            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#f4c542;font-weight:700">DIACA · Acceso</div>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;line-height:1.3">Has sido invitado</h1>
          </td></tr>
          <tr><td style="padding:28px">
            <p style="margin:0 0 18px;color:#334155;line-height:1.65">Hola ${fullName},</p>
            <p style="margin:0 0 18px;color:#334155;line-height:1.65">Has sido invitado a formar parte del sistema administrativo de DIACA.</p>
            <p style="margin:0 0 22px;color:#334155;line-height:1.65">Tu acceso ha sido preparado con el rol: <strong style="color:#0b2341">${roleName}</strong>.</p>
            <p style="margin:0 0 24px;color:#334155;line-height:1.65">Para completar tu cuenta, confirma la invitación y crea tu contraseña.</p>
            <p style="margin:0 0 24px"><a href="${invitationUrl}" style="display:inline-block;background:#0b2341;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;border-bottom:3px solid #d9ad4f">Aceptar invitación</a></p>
            <p style="margin:0 0 10px;color:#64748b;font-size:13px;line-height:1.55">Este enlace es personal y tiene tiempo limitado.</p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.55">Si no esperabas esta invitación, puedes ignorar este correo.</p>
          </td></tr>
          <tr><td style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">DIACA · Asesoría Educativa</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}
