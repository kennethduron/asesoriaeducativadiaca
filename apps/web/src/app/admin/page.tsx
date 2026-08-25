import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  FileBarChart,
  WalletCards,
} from "lucide-react";

import {
  AgingChart,
  BillingCollectionChart,
  RevenueChart,
} from "@/components/admin/dashboard-charts";
import {
  DashboardSection,
  EmptyMetric,
  ErrorMetric,
  MetricCard,
  MoneyMetric,
} from "@/components/admin/dashboard-components";
import { hasPermission, requireUser } from "@/lib/auth/authorization";
import { getDashboardSummary } from "@/lib/dashboard/queries";
import { toChartSeries } from "@/lib/dashboard/types";
import { parseDashboardFilters } from "@/lib/dashboard/validation";
import { formatMoney } from "@/lib/financial/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const periodLabels = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  previous_month: "Mes anterior",
  last_30_days: "Últimos 30 días",
  year: "Este año",
  custom: "Personalizado",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requireUser();
  const { filters, error: filterError } = parseDashboardFilters(
    await searchParams,
  );
  const summary = await getDashboardSummary(filters).catch(() => null);
  const displayName = principal.fullName || principal.email || "usuario";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
            Panel administrativo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Bienvenido, {displayName}
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Resumen operativo y financiero derivado de la fuente oficial. Rol
            activo: <strong>{principal.roleName}</strong>.
          </p>
        </div>
        {hasPermission(principal, "reports.read") ? (
          <Link
            href="/admin/reportes"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17365d] px-4 font-semibold text-white"
          >
            <FileBarChart className="size-4" aria-hidden="true" /> Abrir
            reportes
          </Link>
        ) : null}
      </div>

      <form className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_1fr_1fr_auto]">
        <label className="text-sm font-medium text-slate-700">
          Período
          <select
            name="period"
            defaultValue={filters.period}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Moneda
          <select
            name="currency"
            defaultValue={filters.currency}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="HNL">HNL</option>
            <option value="USD">USD</option>
          </select>
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
        <button className="min-h-11 self-end rounded-xl bg-[#0b2341] px-5 font-semibold text-white">
          Aplicar
        </button>
      </form>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <CalendarDays className="size-4" aria-hidden="true" /> {filters.from} a{" "}
        {filters.to} · America/Tegucigalpa
      </p>
      {filterError ? (
        <div className="mt-4">
          <ErrorMetric>{filterError} Se mostró el período actual.</ErrorMetric>
        </div>
      ) : null}
      {!summary ? (
        <div className="mt-6">
          <ErrorMetric>
            No pudimos cargar el dashboard. Intenta nuevamente.
          </ErrorMetric>
        </div>
      ) : null}

      {summary?.clients || summary?.services ? (
        <DashboardSection
          title="Operación"
          description="Clientes y servicios según su estado vigente."
        >
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summary.clients ? (
              <>
                <MetricCard
                  label="Clientes activos"
                  value={summary.clients.active}
                  detail="No incluye clientes inactivos"
                />
                <MetricCard
                  label="Nuevos clientes"
                  value={summary.clients.new_current}
                  trend={{
                    current: summary.clients.new_current,
                    previous: summary.clients.new_previous,
                  }}
                />
              </>
            ) : null}
            {summary.services ? (
              <MetricCard
                label="Servicios activos"
                value={summary.services.active}
                detail="Solo contratos con estado activo"
              />
            ) : null}
          </div>
        </DashboardSection>
      ) : null}

      {summary?.financial ? (
        <>
          <DashboardSection
            title="Resumen financiero"
            description={`Montos separados en ${summary.financial.currency}; no se aplica conversión de moneda.`}
          >
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total facturado"
                value={
                  <MoneyMetric
                    value={summary.financial.billed.current}
                    currency={summary.financial.currency}
                  />
                }
                trend={{
                  current: summary.financial.billed.current,
                  previous: summary.financial.billed.previous,
                }}
              />
              <MetricCard
                label="Ingresos cobrados"
                value={
                  <MoneyMetric
                    value={summary.financial.collected.current}
                    currency={summary.financial.currency}
                  />
                }
                trend={{
                  current: summary.financial.collected.current,
                  previous: summary.financial.collected.previous,
                }}
              />
              <MetricCard
                label="Saldo pendiente"
                value={
                  <MoneyMetric
                    value={summary.financial.outstanding}
                    currency={summary.financial.currency}
                  />
                }
                detail="Saldos abiertos derivados"
              />
              <MetricCard
                label="Saldo vencido"
                value={
                  <MoneyMetric
                    value={summary.financial.overdue}
                    currency={summary.financial.currency}
                  />
                }
                detail={`${summary.financial.delinquent_clients} clientes con morosidad`}
              />
              <MetricCard
                label="Crédito no aplicado"
                value={
                  <MoneyMetric
                    value={summary.financial.unapplied_credit}
                    currency={summary.financial.currency}
                  />
                }
                detail="Se mantiene separado del overdue"
              />
            </div>
          </DashboardSection>

          <DashboardSection
            title="Tendencias"
            description="Valores accesibles además de la representación visual."
          >
            {summary.financial.series.length ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="font-semibold">Ingresos cobrados</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Evolución por{" "}
                    {summary.financial.granularity === "day" ? "día" : "mes"}.
                  </p>
                  <RevenueChart
                    data={toChartSeries(summary)}
                    currency={summary.financial.currency}
                  />
                </article>
                <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="font-semibold">Facturado vs. cobrado</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Comparación sin confundir cargos con ingresos.
                  </p>
                  <BillingCollectionChart
                    data={toChartSeries(summary)}
                    currency={summary.financial.currency}
                  />
                </article>
              </div>
            ) : (
              <div className="mt-4">
                <EmptyMetric />
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Aging y alertas"
            description="El crédito no aplicado no reduce automáticamente la morosidad."
          >
            <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-semibold">Distribución de antigüedad</h3>
                <AgingChart
                  currency={summary.financial.currency}
                  data={[
                    {
                      label: "Al corriente",
                      amount: summary.financial.aging.current,
                    },
                    { label: "1–30", amount: summary.financial.aging["1_30"] },
                    {
                      label: "31–60",
                      amount: summary.financial.aging["31_60"],
                    },
                    {
                      label: "61–90",
                      amount: summary.financial.aging["61_90"],
                    },
                    {
                      label: "90+",
                      amount: summary.financial.aging["90_plus"],
                    },
                  ]}
                />
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-amber-950">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                  <h3 className="font-semibold">Atención prioritaria</h3>
                </div>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-amber-900">Saldo con 90+ días</dt>
                    <dd className="mt-1 text-xl font-semibold">
                      {formatMoney(
                        summary.financial.aging["90_plus"],
                        summary.financial.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-amber-900">Crédito sin aplicar</dt>
                    <dd className="mt-1 text-xl font-semibold">
                      {formatMoney(
                        summary.financial.unapplied_credit,
                        summary.financial.currency,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Mayores saldos vencidos"
            description="Máximo ocho clientes en la moneda seleccionada."
            action={
              <Link
                href="/admin/estados-de-cuenta?balance=overdue"
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#17365d]"
              >
                Ver cartera <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          >
            {summary.financial.top_overdue.length ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {summary.financial.top_overdue.map((item) => (
                  <article
                    key={`${item.client_id}-${item.currency_code}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-slate-500">
                          {item.client_code} · {item.currency_code}
                        </p>
                        <h3 className="mt-1 font-semibold">
                          {item.client_name}
                        </h3>
                      </div>
                      <WalletCards
                        className="size-5 text-amber-700"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-3 text-xl font-semibold">
                      {formatMoney(item.overdue_balance, item.currency_code)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.days_overdue} días desde el vencimiento más antiguo
                    </p>
                    <Link
                      href={`/admin/clientes/${item.client_id}?tab=estado-cuenta&currency=${item.currency_code}`}
                      className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#17365d]"
                    >
                      Abrir estado de cuenta
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyMetric>
                  No hay saldos vencidos en esta moneda.
                </EmptyMetric>
              </div>
            )}
          </DashboardSection>
        </>
      ) : null}

      {summary?.services?.by_category.length ? (
        <DashboardSection title="Servicios por categoría">
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summary.services.by_category.map((item) => (
              <article
                key={item.category_id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm text-slate-500">{item.category}</p>
                <p className="mt-2 text-2xl font-semibold">{item.count}</p>
              </article>
            ))}
          </div>
        </DashboardSection>
      ) : null}
      {summary?.recent_activity.length ? (
        <DashboardSection
          title="Actividad reciente"
          description="Eventos administrativos útiles; no es el audit log técnico completo."
        >
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {summary.recent_activity.map((item, index) => (
              <li key={`${item.type}-${item.occurred_at}-${index}`}>
                <Link
                  href={item.href}
                  className="block min-h-11 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300"
                >
                  <span className="text-xs font-semibold tracking-wide text-amber-700 uppercase">
                    {item.detail}
                  </span>
                  <span className="mt-1 block font-semibold text-slate-950">
                    {item.label}
                  </span>
                  <time className="mt-1 block text-xs text-slate-500">
                    {new Intl.DateTimeFormat("es-HN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "America/Tegucigalpa",
                    }).format(new Date(item.occurred_at))}
                  </time>
                </Link>
              </li>
            ))}
          </ol>
        </DashboardSection>
      ) : null}
    </div>
  );
}
