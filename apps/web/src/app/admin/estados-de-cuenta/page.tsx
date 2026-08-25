import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { redirect } from "next/navigation";

import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import { formatMoney } from "@/lib/financial/money";
import { listClientAccounts } from "@/lib/statements/queries";
import { portfolioFilterSchema } from "@/lib/statements/validation";

function portfolioUrl(
  filters: Record<string, string | number | undefined | null>,
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  });
  return `/admin/estados-de-cuenta?${params}`;
}

export default async function AccountPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("charges.read");
  if (!hasPermission(principal, "payments.read")) redirect("/access-denied");
  const raw = await searchParams;
  const filters = portfolioFilterSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    currency: typeof raw.currency === "string" ? raw.currency : undefined,
    balance: typeof raw.balance === "string" ? raw.balance : "all",
    sort: typeof raw.sort === "string" ? raw.sort : "client_name",
    direction: typeof raw.direction === "string" ? raw.direction : "asc",
    page: typeof raw.page === "string" ? raw.page : 1,
    pageSize: typeof raw.pageSize === "string" ? raw.pageSize : 20,
  });
  const accounts = await listClientAccounts(filters);
  const total = Number(accounts[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const common = { ...filters, page: undefined };

  return (
    <div>
      <header>
        <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
          Finanzas
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Estados de cuenta
        </h1>
        <p className="mt-2 text-slate-600">
          {total} saldos por cliente y moneda. Ninguna moneda se combina con
          otra.
        </p>
      </header>

      <form
        role="search"
        className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[1fr_150px_190px_190px_130px_auto]"
      >
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute top-3 left-3 size-5 text-slate-400" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Nombre o código de cliente"
            className="h-11 w-full rounded-xl border border-slate-300 pr-3 pl-10"
          />
        </label>
        <label>
          <span className="sr-only">Moneda</span>
          <select
            name="currency"
            defaultValue={filters.currency ?? ""}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="">Todas las monedas</option>
            <option value="HNL">HNL</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Estado de saldo</span>
          <select
            name="balance"
            defaultValue={filters.balance}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="all">Todos</option>
            <option value="outstanding">Con saldo pendiente</option>
            <option value="overdue">Con saldo vencido</option>
            <option value="current">Al día</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Ordenar por</span>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="client_name">Cliente</option>
            <option value="outstanding_balance">Saldo pendiente</option>
            <option value="overdue_balance">Saldo vencido</option>
            <option value="oldest_due_date">Vencimiento más antiguo</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Dirección</span>
          <select
            name="direction"
            defaultValue={filters.direction}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </label>
        <button className="min-h-11 rounded-xl bg-[#0b2341] px-4 font-semibold text-white">
          Aplicar
        </button>
      </form>

      {accounts.length ? (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">
                Cartera de clientes por moneda
              </caption>
              <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  {[
                    "Cliente",
                    "Moneda",
                    "Facturado",
                    "Pendiente",
                    "Vencido",
                    "Vencimiento más antiguo",
                    "Estado",
                    "Acción",
                  ].map((title) => (
                    <th key={title} scope="col" className="px-4 py-3">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((account) => (
                  <tr key={`${account.client_id}-${account.currency_code}`}>
                    <td className="px-4 py-4">
                      <span className="font-semibold">
                        {account.client_name}
                      </span>
                      <span className="block font-mono text-xs text-slate-500">
                        {account.client_code}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {account.currency_code}
                    </td>
                    <td className="px-4 py-4">
                      {formatMoney(
                        account.total_charged,
                        account.currency_code,
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatMoney(
                        account.outstanding_balance,
                        account.currency_code,
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold text-amber-900">
                      {formatMoney(
                        account.overdue_balance,
                        account.currency_code,
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {account.oldest_due_date ?? "Sin fecha"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.is_delinquent ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-950"}`}
                      >
                        {account.is_delinquent ? "Con saldo vencido" : "Al día"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/clientes/${account.client_id}?tab=estado-cuenta&currency=${account.currency_code}`}
                        className="inline-flex min-h-11 items-center font-semibold text-[#17365d]"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-3 lg:hidden">
            {accounts.map((account) => (
              <article
                key={`${account.client_id}-${account.currency_code}`}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">
                      {account.client_code} · {account.currency_code}
                    </p>
                    <h2 className="mt-1 font-semibold">
                      {account.client_name}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.is_delinquent ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-950"}`}
                  >
                    {account.is_delinquent ? "Vencido" : "Al día"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Saldo pendiente</dt>
                    <dd className="font-semibold">
                      {formatMoney(
                        account.outstanding_balance,
                        account.currency_code,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Saldo vencido</dt>
                    <dd className="font-semibold">
                      {formatMoney(
                        account.overdue_balance,
                        account.currency_code,
                      )}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/admin/clientes/${account.client_id}?tab=estado-cuenta&currency=${account.currency_code}`}
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#17365d]"
                >
                  Abrir estado de cuenta
                </Link>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No hay saldos que coincidan con los filtros.
        </p>
      )}

      <nav
        aria-label="Paginación"
        className="mt-6 flex items-center justify-between gap-3"
      >
        <Link
          aria-disabled={filters.page <= 1}
          tabIndex={filters.page <= 1 ? -1 : undefined}
          href={portfolioUrl({
            ...common,
            page: Math.max(1, filters.page - 1),
          })}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold ${filters.page <= 1 ? "pointer-events-none opacity-40" : "bg-white"}`}
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> Anterior
        </Link>
        <span className="text-sm text-slate-600">
          Página {Math.min(filters.page, pages)} de {pages}
        </span>
        <Link
          aria-disabled={filters.page >= pages}
          tabIndex={filters.page >= pages ? -1 : undefined}
          href={portfolioUrl({
            ...common,
            page: Math.min(pages, filters.page + 1),
          })}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold ${filters.page >= pages ? "pointer-events-none opacity-40" : "bg-white"}`}
        >
          Siguiente <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}
