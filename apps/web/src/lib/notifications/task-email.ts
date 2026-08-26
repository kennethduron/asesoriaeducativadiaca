export function buildTaskReminderEmail(input: {
  title: string;
  priority: string;
  dueAt: string;
  taskUrl: string;
}) {
  const priority: Record<string, string> = {
    low: "Baja",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };
  const due = new Intl.DateTimeFormat("es-HN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(input.dueAt));
  const escape = (value: string) =>
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
  return {
    subject: `Recordatorio DIACA: ${input.title}`.slice(0, 180),
    html: `<div style="font-family:Arial,sans-serif;color:#0b2341;line-height:1.6"><h1 style="font-size:22px">Recordatorio DIACA</h1><p>Tiene una tarea programada:</p><h2 style="font-size:18px">${escape(input.title)}</h2><p><strong>Fecha y hora:</strong> ${escape(due)}<br><strong>Prioridad:</strong> ${escape(priority[input.priority] ?? input.priority)}</p><p><a href="${escape(input.taskUrl)}" style="display:inline-block;padding:12px 18px;background:#0b2341;color:#fff;text-decoration:none;border-radius:10px">Ver tarea</a></p><p style="font-size:12px;color:#64748b">Mensaje administrativo automático. No responda con información sensible.</p></div>`,
  };
}
