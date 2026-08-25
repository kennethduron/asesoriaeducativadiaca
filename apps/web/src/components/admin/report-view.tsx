import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

import { formatMoney } from "@/lib/financial/money";
import {
  reportCatalog,
  type ReportColumn,
  type ReportType,
} from "@/lib/reports/config";
import type { ReportData } from "@/lib/reports/types";
import {
  reportSearchParams,
  type ReportFilters,
} from "@/lib/reports/validation";

type Options = Awaited<
  ReturnType<typeof import("@/lib/reports/queries").getReportFilterOptions>
>;
const summaryLabels: Record<string, string> = {
  active: "Activos",
  inactive: "Inactivos",
  pending: "Pendientes",
  completed: "Completados",
  billed: "Facturado",
  applied: "Aplicado",
  outstanding: "Pendiente",
  confirmed: "Confirmado",
  unapplied: "No aplicado",
  overdue: "Vencido",
  not_due: "No vencido",
  current_balance: "Al corriente",
  balance_1_30: "1–30",
  balance_31_60: "31–60",
  balance_61_90: "61–90",
  balance_90_plus: "90+",
  total_overdue: "Total vencido",
  voided_count: "Anulados",
};
const moneySummaryKeys = new Set([
  "billed",
  "applied",
  "outstanding",
  "confirmed",
  "unapplied",
  "overdue",
  "not_due",
  "current_balance",
  "balance_1_30",
  "balance_31_60",
  "balance_61_90",
  "balance_90_plus",
  "total_overdue",
]);

function text(value: unknown) {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}
function statusLabel(type: ReportType, value: unknown) {
  return reportCatalog[type].statuses?.[String(value)] ?? text(value);
}

function ReportCell({
  type,
  column,
  row,
}: {
  type: ReportType;
  column: ReportColumn;
  row: Record<string, unknown>;
}) {
  const value = row[column.key];
  if (column.kind === "money")
    return (
      <>{formatMoney(Number(value ?? 0), String(row.currency_code ?? "HNL"))}</>
    );
  if (column.kind === "date")
    return (
      <>
        {value
          ? new Intl.DateTimeFormat("es-HN", {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(new Date(`${value}T00:00:00Z`))
          : "—"}
      </>
    );
  if (column.kind === "status")
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
        {statusLabel(type, value)}
      </span>
    );
  const href =
    column.kind === "client" && row.client_id
      ? `/admin/clientes/${row.client_id}`
      : column.kind === "charge" && row.id
        ? `/admin/cargos/${row.id}`
        : column.kind === "payment" && row.id
          ? `/admin/pagos/${row.id}`
          : column.kind === "receipt" && row.receipt_id
            ? `/admin/recibos/${row.receipt_id}`
            : null;
  return href ? (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center font-semibold text-[#17365d]"
    >
      {text(value)}
    </Link>
  ) : (
    <>{text(value)}</>
  );
}

export function ReportFiltersForm({
  type,
  filters,
  options,
}: {
  type: ReportType;
  filters: ReportFilters;
  options: Options;
}) {
  const definition = reportCatalog[type];
  const showClient = [
    "services",
    "charges",
    "payments",
    "receivables",
    "aging",
  ].includes(type);
  const showService = ["clients", "services", "charges"].includes(type);
  return (
    <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Buscar</span>
          <Search
            className="pointer-events-none absolute bottom-3 left-3 size-5 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="q"
            defaultValue={filters.q}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 pr-3 pl-10"
            placeholder="Cliente, código o referencia"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Desde
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Hasta
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
          />
        </label>
        {!["clients", "services"].includes(type) ? (
          <label className="text-sm font-medium text-slate-700">
            Moneda
            <select
              name="currency"
              defaultValue={filters.currency ?? ""}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">Todas, sin sumar</option>
              <option value="HNL">HNL</option>
              <option value="USD">USD</option>
            </select>
          </label>
        ) : null}
        {definition.statuses ? (
          <label className="text-sm font-medium text-slate-700">
            Estado
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">Todos</option>
              {Object.entries(definition.statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showClient ? (
          <label className="text-sm font-medium text-slate-700">
            Cliente
            <select
              name="client"
              defaultValue={filters.client ?? ""}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">Todos</option>
              {options.clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.client_code} · {item.full_name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showService ? (
          <label className="text-sm font-medium text-slate-700">
            Servicio
            <select
              name="service"
              defaultValue={filters.service ?? ""}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">Todos</option>
              {options.services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {["clients", "services"].includes(type) ? (
          <label className="text-sm font-medium text-slate-700">
            Categoría
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">Todas</option>
              {options.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {type === "payments" ? (
          <label className="text-sm font-medium text-slate-700">
            Método
            <select
              name="method"
              defaultValue={filters.method ?? ""}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">Todos</option>
              {options.methods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {["receivables", "aging"].includes(type) ? (
          <label className="text-sm font-medium text-slate-700">
            Aging
            <select
              name="aging"
              defaultValue={filters.aging ?? ""}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">Todos</option>
              <option value="current">Al corriente</option>
              <option value="1_30">1–30</option>
              <option value="31_60">31–60</option>
              <option value="61_90">61–90</option>
              <option value="90_plus">90+</option>
            </select>
          </label>
        ) : null}
        <label className="text-sm font-medium text-slate-700">
          Orden
          <select
            name="sort"
            defaultValue={filters.sort}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            {Object.entries(definition.sorts).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Dirección
          <select
            name="direction"
            defaultValue={filters.direction}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Filas
          <select
            name="pageSize"
            defaultValue={filters.pageSize}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
        <button className="min-h-11 self-end rounded-xl bg-[#0b2341] px-5 font-semibold text-white">
          Aplicar filtros
        </button>
      </div>
    </form>
  );
}

export function ReportSummary({ summary }: { summary: ReportData["summary"] }) {
  const groups = Array.isArray(summary) ? summary : [summary];
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group, index) => (
        <article
          key={`${String(group.currency_code ?? "counts")}-${index}`}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold">
            {group.currency_code
              ? `Resumen ${String(group.currency_code)}`
              : "Resumen"}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {Object.entries(group)
              .filter(([key]) => key !== "currency_code")
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-slate-500">
                    {summaryLabels[key] ?? key}
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {moneySummaryKeys.has(key) && group.currency_code
                      ? formatMoney(
                          Number(value ?? 0),
                          String(group.currency_code),
                        )
                      : text(value ?? 0)}
                  </dd>
                </div>
              ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

export function ReportResults({
  type,
  data,
  filters,
  canExport,
}: {
  type: ReportType;
  data: ReportData;
  filters: ReportFilters;
  canExport: boolean;
}) {
  const definition = reportCatalog[type];
  const exportQuery = reportSearchParams(filters, false).toString();
  const pages = Math.max(1, Math.ceil(data.total_count / filters.pageSize));
  const pageUrl = (page: number) =>
    `/admin/reportes/${type}?${reportSearchParams({ ...filters, page }).toString()}`;
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{data.total_count} registros</p>
        {canExport ? (
          <div className="flex gap-2">
            <a
              href={`/admin/reportes/${type}/excel?${exportQuery}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 font-semibold text-emerald-800"
            >
              <Download className="size-4" aria-hidden="true" /> Excel
            </a>
            <a
              href={`/admin/reportes/${type}/pdf?${exportQuery}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#17365d] bg-white px-4 font-semibold text-[#17365d]"
            >
              <Download className="size-4" aria-hidden="true" /> PDF
            </a>
          </div>
        ) : null}
      </div>
      <ReportSummary summary={data.summary} />
      {data.rows.length ? (
        <>
          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
            <table className="w-full min-w-[940px] text-left text-sm">
              <caption className="sr-only">
                Reporte de {definition.title}
              </caption>
              <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  {definition.columns.map((column) => (
                    <th key={column.key} scope="col" className="px-4 py-3">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((row, index) => (
                  <tr key={String(row.id ?? row.client_id ?? index)}>
                    {definition.columns.map((column) => (
                      <td key={column.key} className="px-4 py-3">
                        <ReportCell type={type} column={column} row={row} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-3 lg:hidden">
            {data.rows.map((row, index) => (
              <article
                key={String(row.id ?? row.client_id ?? index)}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <dl className="grid gap-3 sm:grid-cols-2">
                  {definition.columns.map((column) => (
                    <div key={column.key}>
                      <dt className="text-xs font-medium text-slate-500 uppercase">
                        {column.label}
                      </dt>
                      <dd className="mt-1 text-sm">
                        <ReportCell type={type} column={column} row={row} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          Sin registros para los filtros seleccionados.
        </p>
      )}
      <nav
        aria-label="Paginación"
        className="mt-6 flex items-center justify-between gap-3"
      >
        <Link
          aria-disabled={filters.page <= 1}
          tabIndex={filters.page <= 1 ? -1 : undefined}
          href={pageUrl(Math.max(1, filters.page - 1))}
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
          href={pageUrl(Math.min(pages, filters.page + 1))}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold ${filters.page >= pages ? "pointer-events-none opacity-40" : "bg-white"}`}
        >
          Siguiente <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </nav>
    </>
  );
}
