import { z } from "zod";

import { reportCatalog, type ReportType } from "./config";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
const baseSchema = z.object({
  q: z.string().trim().max(160).default(""),
  from: isoDate.optional(),
  to: isoDate.optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  status: z.string().max(30).optional(),
  client: uuid.optional(),
  category: uuid.optional(),
  service: uuid.optional(),
  method: uuid.optional(),
  aging: z.enum(["current", "1_30", "31_60", "61_90", "90_plus"]).optional(),
  sort: z.string().max(30),
  direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [20, 50, 100].includes(value))
    .default(20),
});

export type ReportFilters = z.infer<typeof baseSchema>;
const scalar = (value: string | string[] | undefined) =>
  typeof value === "string" && value !== "" ? value : undefined;

function normalized(
  type: ReportType,
  raw: Record<string, string | string[] | undefined>,
) {
  return {
    q: scalar(raw.q) ?? "",
    from: scalar(raw.from),
    to: scalar(raw.to),
    currency: scalar(raw.currency)?.toUpperCase(),
    status: scalar(raw.status),
    client: scalar(raw.client),
    category: scalar(raw.category),
    service: scalar(raw.service),
    method: scalar(raw.method),
    aging: scalar(raw.aging),
    sort: scalar(raw.sort) ?? reportCatalog[type].defaultSort,
    direction: scalar(raw.direction) ?? "desc",
    page: scalar(raw.page) ?? 1,
    pageSize: scalar(raw.pageSize) ?? 20,
  };
}

function validateContract(type: ReportType, value: ReportFilters) {
  if (!(value.sort in reportCatalog[type].sorts))
    throw new Error("INVALID_REPORT_SORT");
  if (value.status && !reportCatalog[type].statuses?.[value.status])
    throw new Error("INVALID_REPORT_STATUS");
  if (value.from && value.to) {
    const days =
      (Date.parse(`${value.to}T00:00:00Z`) -
        Date.parse(`${value.from}T00:00:00Z`)) /
      86_400_000;
    if (days < 0 || days > 730) throw new Error("INVALID_REPORT_RANGE");
  }
  return value;
}

export function parseReportFilters(
  type: ReportType,
  raw: Record<string, string | string[] | undefined>,
) {
  try {
    return {
      filters: validateContract(type, baseSchema.parse(normalized(type, raw))),
      error: null as string | null,
    };
  } catch {
    return {
      filters: baseSchema.parse(normalized(type, {})),
      error: "Uno o más filtros no eran válidos; se restablecieron.",
    };
  }
}

export function parseReportFiltersStrict(
  type: ReportType,
  search: URLSearchParams,
) {
  const raw = Object.fromEntries(search.entries());
  return validateContract(type, baseSchema.parse(normalized(type, raw)));
}

export function reportSearchParams(filters: ReportFilters, includePage = true) {
  const params = new URLSearchParams();
  const values: Record<string, string | number | undefined> = {
    q: filters.q || undefined,
    from: filters.from,
    to: filters.to,
    currency: filters.currency,
    status: filters.status,
    client: filters.client,
    category: filters.category,
    service: filters.service,
    method: filters.method,
    aging: filters.aging,
    sort: filters.sort,
    direction: filters.direction,
    page: includePage ? filters.page : undefined,
    pageSize: filters.pageSize,
  };
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params;
}
