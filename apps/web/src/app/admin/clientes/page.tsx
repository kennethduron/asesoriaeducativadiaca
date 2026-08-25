import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";

import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import { listClients } from "@/lib/crm/queries";
import { clientListSchema } from "@/lib/crm/validation";

export const dynamic = "force-dynamic";

function clientUrl(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return `/admin/clientes?${params.toString()}`;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("clients.read");
  const raw = await searchParams;
  const filters = clientListSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    status: typeof raw.status === "string" ? raw.status : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    direction: typeof raw.direction === "string" ? raw.direction : undefined,
    page: typeof raw.page === "string" ? raw.page : 1,
    pageSize: typeof raw.pageSize === "string" ? raw.pageSize : 20,
  });
  const clients = await listClients(filters);
  const total = Number(clients[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const canWrite = hasPermission(principal, "clients.write");
  const common = {
    q: filters.q,
    status: filters.status,
    sort: filters.sort,
    direction: filters.direction,
    pageSize: filters.pageSize,
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
            CRM
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Clientes
          </h1>
          <p className="mt-2 text-slate-600">{total} registros encontrados.</p>
        </div>
        {canWrite ? (
          <Link
            href="/admin/clientes/nuevo"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
          >
            <UserPlus className="size-4" /> Nuevo cliente
          </Link>
        ) : null}
      </div>

      <form
        className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 xl:grid-cols-[1fr_180px_180px_auto]"
        role="search"
      >
        <label className="relative">
          <span className="sr-only">Buscar clientes</span>
          <Search className="pointer-events-none absolute top-3 left-3 size-5 text-slate-400" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Nombre, código o contacto"
            className="h-11 w-full rounded-xl border border-slate-300 pr-3 pl-10"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por estado</span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Ordenar clientes</span>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="registered_on">Fecha de registro</option>
            <option value="full_name">Nombre</option>
            <option value="client_code">Código</option>
            <option value="status">Estado</option>
          </select>
        </label>
        <button className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold hover:bg-slate-50">
          Aplicar
        </button>
      </form>

      {clients.length ? (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Listado paginado de clientes
              </caption>
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
                <tr>
                  {[
                    "Código",
                    "Cliente",
                    "Contacto",
                    "Estado",
                    "Registro",
                    "Servicios activos",
                    "Acciones",
                  ].map((title) => (
                    <th key={title} scope="col" className="px-4 py-3">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-4 font-mono text-xs">
                      {client.client_code}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-950">
                        {client.full_name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {client.client_type === "business"
                          ? "Empresa"
                          : "Persona"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {client.phone ||
                        client.whatsapp ||
                        client.email ||
                        "Sin contacto"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${client.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
                      >
                        {client.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {new Intl.DateTimeFormat("es-HN").format(
                        new Date(`${client.registered_on}T12:00:00`),
                      )}
                    </td>
                    <td className="px-4 py-4 text-center font-semibold">
                      {client.active_services_count}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/clientes/${client.id}`}
                        className="font-semibold text-[#17365d] underline-offset-4 hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-3 lg:hidden">
            {clients.map((client) => (
              <article
                key={client.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">
                      {client.client_code}
                    </p>
                    <h2 className="mt-1 font-semibold">{client.full_name}</h2>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${client.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
                  >
                    {client.status === "active" ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Contacto</dt>
                    <dd>{client.phone || client.whatsapp || "Sin teléfono"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Servicios activos</dt>
                    <dd>{client.active_services_count}</dd>
                  </div>
                </dl>
                <Link
                  href={`/admin/clientes/${client.id}`}
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#17365d]"
                >
                  Ver perfil
                </Link>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-semibold">
            Todavía no hay clientes que coincidan.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Ajusta los filtros o registra el primer cliente.
          </p>
          {canWrite ? (
            <Link
              href="/admin/clientes/nuevo"
              className="mt-5 inline-flex rounded-xl bg-[#0b2341] px-4 py-3 font-semibold text-white"
            >
              Registrar primer cliente
            </Link>
          ) : null}
        </div>
      )}

      <nav
        aria-label="Paginación"
        className="mt-6 flex items-center justify-between"
      >
        <Link
          aria-disabled={filters.page <= 1}
          tabIndex={filters.page <= 1 ? -1 : undefined}
          href={clientUrl({ ...common, page: Math.max(1, filters.page - 1) })}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold ${filters.page <= 1 ? "pointer-events-none opacity-40" : "bg-white"}`}
        >
          <ChevronLeft className="size-4" /> Anterior
        </Link>
        <span className="text-sm text-slate-600">
          Página {Math.min(filters.page, pages)} de {pages}
        </span>
        <Link
          aria-disabled={filters.page >= pages}
          tabIndex={filters.page >= pages ? -1 : undefined}
          href={clientUrl({
            ...common,
            page: Math.min(pages, filters.page + 1),
          })}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold ${filters.page >= pages ? "pointer-events-none opacity-40" : "bg-white"}`}
        >
          Siguiente <ChevronRight className="size-4" />
        </Link>
      </nav>
    </div>
  );
}
