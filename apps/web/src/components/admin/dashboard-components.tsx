import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";

import { formatMoney } from "@/lib/financial/money";
import { calculateTrend } from "@/lib/dashboard/validation";

export function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="mt-9">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="text-xl font-semibold text-slate-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  trend?: { current: number; previous: number };
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <div className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        {value}
      </div>
      <div className="mt-3 min-h-6 text-sm text-slate-500">
        {trend ? (
          <TrendIndicator current={trend.current} previous={trend.previous} />
        ) : (
          detail
        )}
      </div>
    </article>
  );
}

export function TrendIndicator({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const trend = calculateTrend(current, previous);
  if (trend.kind === "new")
    return (
      <span className="inline-flex items-center gap-1 font-medium text-sky-800">
        <Sparkles className="size-4" aria-hidden="true" /> Nuevo frente al
        período anterior
      </span>
    );
  if (trend.value === null || trend.kind === "neutral")
    return (
      <span className="inline-flex items-center gap-1">
        <Minus className="size-4" aria-hidden="true" /> Sin variación
      </span>
    );
  const Icon = trend.kind === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-4" aria-hidden="true" />
      {trend.kind === "up" ? "Aumentó" : "Disminuyó"}{" "}
      {Math.abs(trend.value).toFixed(1)}% vs. período anterior
    </span>
  );
}

export function MoneyMetric({
  value,
  currency,
}: {
  value: number;
  currency: string;
}) {
  return <>{formatMoney(value, currency)}</>;
}
export function EmptyMetric({
  children = "No hay movimientos para este período.",
}: {
  children?: ReactNode;
}) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
      {children}
    </p>
  );
}
export function ErrorMetric({
  children = "No pudimos cargar esta sección.",
}: {
  children?: ReactNode;
}) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-900"
    >
      {children}
    </p>
  );
}
