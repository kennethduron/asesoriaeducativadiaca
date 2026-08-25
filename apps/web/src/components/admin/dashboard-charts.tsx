"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/financial/money";

type SeriesPoint = {
  date: string;
  label: string;
  billed: number;
  collected: number;
};
type AgingPoint = { label: string; amount: number };
const compact = (value: number) =>
  Intl.NumberFormat("es-HN", { notation: "compact" }).format(value);

export function RevenueChart({
  data,
  currency,
}: {
  data: SeriesPoint[];
  currency: string;
}) {
  return (
    <div>
      <div
        className="h-72 w-full min-w-0"
        role="img"
        aria-label={`Ingresos cobrados en ${currency} durante el período`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            accessibilityLayer
            margin={{ top: 12, right: 12, bottom: 4, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              width={70}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => compact(Number(value))}
            />
            <Tooltip
              formatter={(value) => [
                formatMoney(Number(value), currency),
                "Cobrado",
              ]}
            />
            <Line
              type="monotone"
              dataKey="collected"
              name="Cobrado"
              stroke="#0f766e"
              strokeWidth={3}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-slate-700">
          Ver valores del gráfico
        </summary>
        <ul className="mt-2 space-y-1 text-slate-600">
          {data.map((point) => (
            <li key={point.date}>
              {point.label}: {formatMoney(point.collected, currency)}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function BillingCollectionChart({
  data,
  currency,
}: {
  data: SeriesPoint[];
  currency: string;
}) {
  return (
    <div>
      <div
        className="h-72 w-full min-w-0"
        role="img"
        aria-label={`Comparación de facturado y cobrado en ${currency}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            accessibilityLayer
            margin={{ top: 12, right: 12, bottom: 4, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              width={70}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => compact(Number(value))}
            />
            <Tooltip
              formatter={(value, name) => [
                formatMoney(Number(value), currency),
                String(name),
              ]}
            />
            <Legend />
            <Bar
              dataKey="billed"
              name="Facturado"
              fill="#17365d"
              radius={[5, 5, 0, 0]}
            />
            <Bar
              dataKey="collected"
              name="Cobrado"
              fill="#d97706"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Facturado representa cargos vigentes; cobrado representa pagos
        confirmados. No son equivalentes.
      </p>
    </div>
  );
}

export function AgingChart({
  data,
  currency,
}: {
  data: AgingPoint[];
  currency: string;
}) {
  return (
    <div>
      <div
        className="h-72 w-full min-w-0"
        role="img"
        aria-label={`Distribución de aging en ${currency}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            accessibilityLayer
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => compact(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={76}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [
                formatMoney(Number(value), currency),
                "Saldo",
              ]}
            />
            <Bar
              dataKey="amount"
              name="Saldo"
              fill="#b45309"
              radius={[0, 5, 5, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {data.map((point) => (
          <li
            key={point.label}
            className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <span>{point.label}</span>
            <strong>{formatMoney(point.amount, currency)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
