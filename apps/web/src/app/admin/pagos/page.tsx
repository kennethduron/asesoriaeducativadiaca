import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import { formatMoney } from "@/lib/financial/money";
import { listPaymentMethods, listPayments } from "@/lib/financial/queries";
import { paymentListSchema } from "@/lib/financial/validation";

const statusLabel: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  voided: "Anulado",
};
function paymentUrl(
  filters: Record<string, string | number | undefined | null>,
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  });
  return `/admin/pagos?${params.toString()}`;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("payments.read");
  const raw = await searchParams;
  const filters = paymentListSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    client: typeof raw.client === "string" ? raw.client : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    method: typeof raw.method === "string" ? raw.method : undefined,
    from: typeof raw.from === "string" ? raw.from : "",
    to: typeof raw.to === "string" ? raw.to : "",
    page: typeof raw.page === "string" ? raw.page : 1,
    pageSize: typeof raw.pageSize === "string" ? raw.pageSize : 20,
  });
  const [payments, methods] = await Promise.all([
    listPayments(filters),
    listPaymentMethods(),
  ]);
  const total = Number(payments[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const common = { ...filters, page: undefined };
  const canCreate =
    hasPermission(principal, "payments.create") &&
    hasPermission(principal, "payments.confirm");
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
            Finanzas
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Pagos</h1>
          <p className="mt-2 text-slate-600">{total} pagos encontrados.</p>
        </div>
        {canCreate ? (
          <Link
            href="/admin/pagos/nuevo"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
          >
            <Plus className="size-4" /> Registrar pago
          </Link>
        ) : null}
      </header>
      <form
        role="search"
        className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[1fr_150px_190px_150px_150px_auto]"
      >
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Buscar pagos</span>
          <Search className="pointer-events-none absolute top-3 left-3 size-5 text-slate-400" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Cliente, código, recibo o referencia"
            className="h-11 w-full rounded-xl border border-slate-300 pr-3 pl-10"
          />
        </label>
        <label>
          <span className="sr-only">Estado</span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="">Todos</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Método</span>
          <select
            name="method"
            defaultValue={filters.method ?? ""}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="">Todos los métodos</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Desde
          <input
            name="from"
            type="date"
            defaultValue={filters.from ?? ""}
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-500">
          Hasta
          <input
            name="to"
            type="date"
            defaultValue={filters.to ?? ""}
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>
        <button className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold">
          Aplicar
        </button>
      </form>
      {payments.length ? (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Listado paginado de pagos</caption>
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
                <tr>
                  {[
                    "Recibo",
                    "Cliente",
                    "Fecha",
                    "Monto",
                    "Aplicado",
                    "No aplicado",
                    "Método",
                    "Estado",
                    "Usuario",
                    "Acción",
                  ].map((title) => (
                    <th key={title} scope="col" className="px-3 py-3">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-4 font-mono text-xs">
                      {payment.receipt_number ?? "—"}
                    </td>
                    <td className="px-3 py-4">
                      <strong>{payment.client_name}</strong>
                      <span className="block font-mono text-xs text-slate-500">
                        {payment.client_code}
                      </span>
                    </td>
                    <td className="px-3 py-4">{payment.payment_date}</td>
                    <td className="px-3 py-4 font-semibold">
                      {formatMoney(payment.amount, payment.currency_code)}
                    </td>
                    <td className="px-3 py-4">
                      {formatMoney(
                        payment.allocated_amount,
                        payment.currency_code,
                      )}
                    </td>
                    <td className="px-3 py-4">
                      {formatMoney(
                        payment.unapplied_amount,
                        payment.currency_code,
                      )}
                    </td>
                    <td className="px-3 py-4">{payment.method_name}</td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                        {statusLabel[payment.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs">
                      {payment.created_by_name}
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/admin/pagos/${payment.id}`}
                        className="inline-flex min-h-11 items-center font-semibold text-[#17365d]"
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
            {payments.map((payment) => (
              <article
                key={payment.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">
                      {payment.receipt_number ?? "Sin recibo"}
                    </p>
                    <h2 className="mt-1 font-semibold">
                      {payment.client_name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                    {statusLabel[payment.status]}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Monto</dt>
                    <dd className="font-semibold">
                      {formatMoney(payment.amount, payment.currency_code)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Fecha</dt>
                    <dd>{payment.payment_date}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Método</dt>
                    <dd>{payment.method_name}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">No aplicado</dt>
                    <dd>
                      {formatMoney(
                        payment.unapplied_amount,
                        payment.currency_code,
                      )}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/admin/pagos/${payment.id}`}
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#17365d]"
                >
                  Ver pago
                </Link>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No hay pagos que coincidan con los filtros.
        </p>
      )}
      <nav
        aria-label="Paginación"
        className="mt-6 flex items-center justify-between"
      >
        <Link
          aria-disabled={filters.page <= 1}
          tabIndex={filters.page <= 1 ? -1 : undefined}
          href={paymentUrl({ ...common, page: Math.max(1, filters.page - 1) })}
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
          href={paymentUrl({
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
