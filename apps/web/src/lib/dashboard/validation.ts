import { z } from "zod";

export const dashboardPeriods = [
  "today",
  "week",
  "month",
  "previous_month",
  "last_30_days",
  "year",
  "custom",
] as const;

export const dashboardPeriodSchema = z.enum(dashboardPeriods);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
export type DashboardFilters = {
  period: DashboardPeriod;
  from: string;
  to: string;
  currency: string;
};

function datePartsInTegucigalpa(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function iso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(today: string) {
  const date = new Date(`${today}T00:00:00.000Z`);
  const day = date.getUTCDay();
  return addDays(today, -(day === 0 ? 6 : day - 1));
}

export function dashboardRange(period: DashboardPeriod, now = new Date()) {
  const { year, month, day } = datePartsInTegucigalpa(now);
  const today = iso(year, month, day);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: startOfWeek(today), to: today };
    case "previous_month": {
      const end = new Date(Date.UTC(year, month - 1, 0));
      return {
        from: iso(end.getUTCFullYear(), end.getUTCMonth() + 1, 1),
        to: end.toISOString().slice(0, 10),
      };
    }
    case "last_30_days":
      return { from: addDays(today, -29), to: today };
    case "year":
      return { from: iso(year, 1, 1), to: today };
    case "custom":
    case "month":
      return { from: iso(year, month, 1), to: today };
  }
}

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function parseDashboardFilters(
  raw: Record<string, string | string[] | undefined>,
  now = new Date(),
): { filters: DashboardFilters; error: string | null } {
  const period = dashboardPeriodSchema.catch("month").parse(scalar(raw.period));
  const defaults = dashboardRange(period, now);
  const currency = currencySchema
    .catch("HNL")
    .parse(scalar(raw.currency)?.toUpperCase());
  if (period !== "custom") {
    return { filters: { period, ...defaults, currency }, error: null };
  }

  const fromResult = isoDateSchema.safeParse(scalar(raw.from));
  const toResult = isoDateSchema.safeParse(scalar(raw.to));
  if (!fromResult.success || !toResult.success) {
    return {
      filters: { period: "month", ...dashboardRange("month", now), currency },
      error: "Selecciona un rango de fechas válido.",
    };
  }
  const today = dashboardRange("today", now).to;
  const days =
    (Date.parse(`${toResult.data}T00:00:00Z`) -
      Date.parse(`${fromResult.data}T00:00:00Z`)) /
    86_400_000;
  if (days < 0 || days > 730 || toResult.data > today) {
    return {
      filters: { period: "month", ...dashboardRange("month", now), currency },
      error: "El rango debe ser válido, no futuro y de hasta 731 días.",
    };
  }
  return {
    filters: {
      period,
      from: fromResult.data,
      to: toResult.data,
      currency,
    },
    error: null,
  };
}

export function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return current > 0
      ? { kind: "new" as const, value: null }
      : { kind: "neutral" as const, value: null };
  }
  const value = ((current - previous) / Math.abs(previous)) * 100;
  return {
    kind:
      value > 0
        ? ("up" as const)
        : value < 0
          ? ("down" as const)
          : ("neutral" as const),
    value,
  };
}
