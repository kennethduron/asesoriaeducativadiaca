import { renderToBuffer } from "@react-pdf/renderer";

import { getCurrentPrincipal, hasPermission } from "@/lib/auth/authorization";
import { StatementPdfDocument } from "@/lib/statements/pdf-document";
import {
  getClientStatement,
  recordStatementGenerated,
} from "@/lib/statements/queries";
import {
  buildStatementFilename,
  statementRouteSchema,
} from "@/lib/statements/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let principal;
  try {
    principal = await getCurrentPrincipal();
  } catch {
    return Response.json(
      { error: "No pudimos validar la sesión." },
      { status: 503, headers: noStoreHeaders },
    );
  }
  if (!principal)
    return Response.json(
      { error: "Inicia sesión para continuar." },
      { status: 401, headers: noStoreHeaders },
    );
  if (
    principal.status !== "active" ||
    !hasPermission(principal, "charges.read") ||
    !hasPermission(principal, "payments.read") ||
    !hasPermission(principal, "reports.export")
  )
    return Response.json(
      { error: "No tienes permiso para generar este documento." },
      { status: 403, headers: noStoreHeaders },
    );

  const { id } = await params;
  const url = new URL(request.url);
  const parsed = statementRouteSchema.safeParse({
    clientId: id,
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    currency: url.searchParams.get("currency")?.toUpperCase(),
  });
  if (!parsed.success)
    return Response.json(
      { error: "Revisa el cliente, el período y la moneda." },
      { status: 400, headers: noStoreHeaders },
    );

  try {
    const filters = {
      from: parsed.data.from,
      to: parsed.data.to,
      currency: parsed.data.currency,
    };
    const statement = await getClientStatement(parsed.data.clientId, filters);
    const document = StatementPdfDocument({ statement });
    const buffer = await renderToBuffer(
      document as Parameters<typeof renderToBuffer>[0],
    );
    await recordStatementGenerated(
      parsed.data.clientId,
      filters,
      crypto.randomUUID(),
    );
    const filename = buildStatementFilename(
      statement.client.client_code,
      statement.period.to,
    );
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...noStoreHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return Response.json(
      { error: "No pudimos generar el documento." },
      { status: 404, headers: noStoreHeaders },
    );
  }
}
