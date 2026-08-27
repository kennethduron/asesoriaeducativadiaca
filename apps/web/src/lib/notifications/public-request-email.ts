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

export function buildPublicRequestEmail(input: {
  name: string;
  email: string;
  phone: string | null;
  service: string;
  createdAt: string;
  requestUrl: string;
}) {
  const createdAt = new Intl.DateTimeFormat("es-HN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(input.createdAt));
  const detail = (label: string, value: string) => `
    <tr><td style="padding:7px 0;color:#64748b;font-size:13px">${escapeHtml(label)}</td></tr>
    <tr><td style="padding:0 0 14px;color:#0b2341;font-size:16px;font-weight:600;word-break:break-word">${escapeHtml(value)}</td></tr>`;
  return {
    subject: "Nueva solicitud recibida — DIACA",
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0b2341">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
          <tr><td style="background:#0b2341;padding:24px 28px;border-top:5px solid #f4c542">
            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#f4c542;font-weight:700">DIACA</div>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;line-height:1.25">Nueva solicitud recibida</h1>
          </td></tr>
          <tr><td style="padding:28px">
            <p style="margin:0 0 22px;color:#334155;line-height:1.65">Se ha recibido una nueva solicitud desde el sitio web de DIACA.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${detail("Nombre", input.name)}
              ${detail("Correo", input.email)}
              ${input.phone ? detail("Teléfono", input.phone) : ""}
              ${detail("Servicio / motivo", input.service)}
              ${detail("Fecha y hora (Honduras)", createdAt)}
            </table>
            <p style="margin:10px 0 24px"><a href="${escapeHtml(input.requestUrl)}" style="display:inline-block;background:#0b2341;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px;border-bottom:3px solid #f4c542">Ver solicitud</a></p>
            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.55">Notificación administrativa automática. Consulta el CRM protegido para ver el detalle completo.</p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`,
  };
}
