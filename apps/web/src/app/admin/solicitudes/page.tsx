import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import { requirePermission } from "@/lib/auth/authorization";
import { listPublicRequests } from "@/lib/public-requests/queries";

export const dynamic = "force-dynamic";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(value));

export default async function PublicRequestsPage() {
  await requirePermission("requests.read");
  const requests = await listPublicRequests();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
            CRM
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Solicitudes públicas
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Solicitudes recibidas desde el formulario del sitio web.
          </p>
        </div>
        <div className="rounded-xl bg-[#0b2341] px-4 py-3 text-sm font-semibold text-white">
          {requests.length} recientes
        </div>
      </div>

      {requests.length ? (
        <div className="mt-7 grid gap-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/admin/solicitudes/${request.id}`}
              className="group grid min-h-24 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="truncate text-slate-950">
                    {request.name}
                  </strong>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    {request.priority}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {request.service}
                </p>
              </div>
              <div className="min-w-0 text-sm text-slate-600">
                <p className="truncate">{request.email}</p>
                <time className="mt-1 block text-xs text-slate-500">
                  {formatDate(request.created_at)}
                </time>
              </div>
              <span className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#17365d]">
                Ver <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Inbox className="mx-auto size-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">No hay solicitudes recibidas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Las nuevas solicitudes aparecerán aquí automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}
