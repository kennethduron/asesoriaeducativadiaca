import { z } from "zod";

const databaseUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const currencyCode = z.string().regex(/^[A-Z]{3}$/);
const dateString = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}, "Selecciona una fecha válida.");

export const statementFilterSchema = z
  .object({
    from: dateString,
    to: dateString,
    currency: currencyCode,
  })
  .refine(({ from, to }) => from <= to, {
    path: ["to"],
    message: "La fecha final no puede ser anterior a la inicial.",
  });

export const portfolioFilterSchema = z.object({
  q: z.string().trim().max(160).catch(""),
  currency: currencyCode.optional().catch(undefined),
  balance: z.enum(["all", "outstanding", "overdue", "current"]).catch("all"),
  sort: z
    .enum([
      "client_name",
      "outstanding_balance",
      "overdue_balance",
      "oldest_due_date",
    ])
    .catch("client_name"),
  direction: z.enum(["asc", "desc"]).catch("asc"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(20), z.literal(50), z.literal(100)]))
    .catch(20),
});

export const statementRouteSchema = z.object({
  clientId: databaseUuid,
  from: dateString,
  to: dateString,
  currency: currencyCode,
});

export type StatementFilters = z.infer<typeof statementFilterSchema>;
export type PortfolioFilters = z.infer<typeof portfolioFilterSchema>;

export function tegucigalpaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

export function oneYearBefore(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const previousYear = year - 1;
  const lastDay = new Date(Date.UTC(previousYear, month, 0)).getUTCDate();
  return `${previousYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function defaultStatementFilters(
  currency = "HNL",
  now = new Date(),
): StatementFilters {
  const to = tegucigalpaDate(now);
  return { from: oneYearBefore(to), to, currency };
}

export function resolveStatementFilters(
  raw: Record<string, string | string[] | undefined>,
  fallbackCurrency = "HNL",
  now = new Date(),
) {
  const defaults = defaultStatementFilters(fallbackCurrency, now);
  return statementFilterSchema.safeParse({
    from: typeof raw.from === "string" ? raw.from : defaults.from,
    to: typeof raw.to === "string" ? raw.to : defaults.to,
    currency:
      typeof raw.currency === "string"
        ? raw.currency.toUpperCase()
        : defaults.currency,
  });
}

export function buildStatementFilename(clientCode: string, to: string) {
  const safeCode = clientCode
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `Estado-de-Cuenta-${safeCode || "Cliente"}-${to}.pdf`;
}
