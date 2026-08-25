import { NextResponse } from "next/server";

import { leadSchema } from "@/lib/validation/lead";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
