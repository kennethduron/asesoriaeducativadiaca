import { NextResponse } from "next/server";

import { leadSchema } from "@/lib/validation/lead";
import { consumeRateLimit, requestSubject } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Solicitud no autorizada." },
      { status: 403 },
    );
  try {
    const limit = await consumeRateLimit({
      scope: "public.leads",
      subject: requestSubject(request.headers),
      windowSeconds: 600,
      maxRequests: 5,
    });
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta nuevamente más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retry_after_seconds) },
        },
      );
  } catch {
    return NextResponse.json(
      { error: "El servicio no está disponible temporalmente." },
      { status: 503 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Los datos de la solicitud no son válidos." },
      { status: 400 },
    );
  }

  const result = leadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Los datos de la solicitud no son válidos." },
      { status: 400 },
    );
  }

  const upstreamUrl = process.env.LEADS_API_URL;
  if (!upstreamUrl) {
    return NextResponse.json(
      { error: "El servicio no está disponible temporalmente." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const status =
        response.status >= 400 && response.status < 500 ? 400 : 502;
      return NextResponse.json(
        { error: "No se pudo procesar la solicitud." },
        { status },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 502 },
    );
  }
}
