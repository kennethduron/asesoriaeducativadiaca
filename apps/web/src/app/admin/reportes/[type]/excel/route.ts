import { getCurrentPrincipal } from "@/lib/auth/authorization";
import { isReportType } from "@/lib/reports/config";
import { buildReportWorkbook } from "@/lib/reports/excel";
import { reportFilename } from "@/lib/reports/export-utils";
import { canExportReport } from "@/lib/reports/permissions";
import { getReportData, recordReportExported } from "@/lib/reports/queries";
import { parseReportFiltersStrict } from "@/lib/reports/validation";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const { type: rawType } = await context.params;
  if (!isReportType(rawType))
    return Response.json(
      { error: "Reporte no encontrado." },
      { status: 404, headers: privateHeaders },
    );
  const principal = await getCurrentPrincipal().catch(() => null);
  if (!principal)
    return Response.json(
      { error: "Autenticación requerida." },
      { status: 401, headers: privateHeaders },
    );
  if (principal.status !== "active" || !canExportReport(principal, rawType))
    return Response.json(
      { error: "Acceso denegado." },
      { status: 403, headers: privateHeaders },
    );
  try {
    const limit = await consumeRateLimit({
      scope: "admin.report_export",
      subject: principal.id,
      windowSeconds: 600,
      maxRequests: 20,
    });
    if (!limit.allowed)
      return Response.json(
        { error: "Demasiadas exportaciones. Intenta nuevamente más tarde." },
        {
          status: 429,
          headers: {
            ...privateHeaders,
            "Retry-After": String(limit.retry_after_seconds),
          },
        },
      );
  } catch {
    return Response.json(
      { error: "El servicio no está disponible temporalmente." },
      { status: 503, headers: privateHeaders },
    );
  }
  let filters;
  try {
    filters = parseReportFiltersStrict(
      rawType,
      new URL(request.url).searchParams,
    );
  } catch {
    return Response.json(
      { error: "Filtros inválidos." },
      { status: 400, headers: privateHeaders },
    );
  }
  try {
    const data = await getReportData(rawType, filters, { exportLimit: 5000 });
    if (data.total_count > 5000)
      return Response.json(
        { error: "El reporte supera 5,000 filas. Ajusta los filtros." },
        { status: 413, headers: privateHeaders },
      );
    const now = new Date();
    const generatedBy =
      principal.fullName || principal.email || "Usuario DIACA";
    const file = await buildReportWorkbook(
      rawType,
      data,
      filters,
      now,
      generatedBy,
    );
    const correlationId = crypto.randomUUID();
    await recordReportExported(
      rawType,
      "xlsx",
      filters,
      data.rows.length,
      correlationId,
    );
    return new Response(new Uint8Array(file), {
      headers: {
        ...privateHeaders,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${reportFilename(rawType, now, "xlsx")}"`,
      },
    });
  } catch {
    return Response.json(
      { error: "No pudimos generar el archivo." },
      { status: 500, headers: privateHeaders },
    );
  }
}
