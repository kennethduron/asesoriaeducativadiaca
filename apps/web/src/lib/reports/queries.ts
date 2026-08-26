import "server-only";

import type { Json } from "@/types/database.generated";
import { createClient } from "@/lib/supabase/server";
import type { ReportType } from "@/lib/reports/config";
import type { ReportFilters } from "@/lib/reports/validation";
import { reportDataSchema } from "@/lib/reports/types";

export async function getReportData(
  type: ReportType,
  filters: ReportFilters,
  options?: { exportLimit?: number },
) {
  const supabase = await createClient();
  const { data, error } =
    type === "bank"
      ? await supabase.rpc("get_bank_report_data", {
          date_from: filters.from,
          date_to: filters.to,
          currency_filter: filters.currency,
          status_filter: filters.status,
          search_query: filters.q || undefined,
          client_filter: filters.client,
          method_filter: filters.method,
          sort_by: filters.sort,
          sort_direction: filters.direction,
          page_number: options ? 1 : filters.page,
          page_size: options?.exportLimit ?? filters.pageSize,
          export_request: Boolean(options),
        })
      : await supabase.rpc("get_report_data", {
          report_kind: type,
          date_from: filters.from,
          date_to: filters.to,
          currency_filter: filters.currency,
          status_filter: filters.status,
          search_query: filters.q || undefined,
          client_filter: filters.client,
          category_filter: filters.category,
          service_filter: filters.service,
          method_filter: filters.method,
          aging_filter: filters.aging,
          sort_by: filters.sort,
          sort_direction: filters.direction,
          page_number: options ? 1 : filters.page,
          page_size: options?.exportLimit ?? filters.pageSize,
          export_request: Boolean(options),
        });
  if (error || !data) throw new Error("REPORT_UNAVAILABLE");
  const parsed = reportDataSchema.safeParse(data);
  if (!parsed.success || parsed.data.type !== type)
    throw new Error("INVALID_REPORT_DATA");
  return parsed.data;
}

export async function recordReportExported(
  type: ReportType,
  format: "xlsx" | "pdf",
  filters: ReportFilters,
  rowCount: number,
  correlationId: string,
) {
  const supabase = await createClient();
  const normalized = {
    q: filters.q || null,
    from: filters.from ?? null,
    to: filters.to ?? null,
    currency: filters.currency ?? null,
    status: filters.status ?? null,
    client: filters.client ?? null,
    category: filters.category ?? null,
    service: filters.service ?? null,
    method: filters.method ?? null,
    aging: filters.aging ?? null,
    sort: filters.sort,
    direction: filters.direction,
  } as Json;
  const { error } = await supabase.rpc("record_report_exported", {
    report_kind: type,
    export_format: format,
    normalized_filters: normalized,
    exported_row_count: rowCount,
    operation_correlation_id: correlationId,
  });
  if (error) throw new Error("REPORT_AUDIT_UNAVAILABLE");
}

export async function getReportFilterOptions() {
  const supabase = await createClient();
  const [clients, categories, services, methods] = await Promise.all([
    supabase
      .from("clients")
      .select("id,client_code,full_name")
      .order("full_name")
      .limit(100),
    supabase
      .from("service_categories")
      .select("id,name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("service_catalog")
      .select("id,name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("payment_methods")
      .select("id,name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (clients.error || categories.error || services.error || methods.error)
    throw new Error("REPORT_OPTIONS_UNAVAILABLE");
  return {
    clients: clients.data ?? [],
    categories: categories.data ?? [],
    services: services.data ?? [],
    methods: methods.data ?? [],
  };
}
