import Link from "next/link";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { getPublicRequest } from "@/lib/public-requests/queries";

export const dynamic = "force-dynamic";

export default async function PublicRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("requests.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const request = await getPublicRequest(id);
  if (!request) notFound();
  const receivedAt = new Intl.DateTimeFormat("es-HN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(request.created_at));
  return (
    <div>
      <Link
        href="/admin/solicitudes"
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#17365d]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver a solicitudes
      </Link>
      <div className="mt-4 rounded-3xl bg-[#0b2341] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-semibold tracking-[0.14em] text-amber-300 uppercase">
          Solicitud web
        </p>
        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {request.name}
        </h1>
        <p className="mt-3 text-slate-300">Recibida {receivedAt}</p>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Contacto</h2>
          <a
            href={`mailto:${request.email}`}
            className="mt-4 flex min-h-11 items-center gap-3 break-all text-[#17365d]"
          >
            <Mail
              className="size-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            {request.email}
          </a>
          {request.phone ? (
            <a
              href={`tel:${request.phone}`}
              className="mt-2 flex min-h-11 items-center gap-3 text-[#17365d]"
            >
              <Phone
                className="size-5 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              {request.phone}
            </a>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No proporcionó teléfono.
            </p>
          )}
          <dl className="mt-6 grid gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Servicio / motivo</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {request.service}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Prioridad</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {request.priority}
              </dd>
            </div>
          </dl>
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Detalle de la solicitud</h2>
          <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-700">
            {request.message}
          </p>
        </section>
      </div>
    </div>
  );
}
