import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DashboardFilters } from "@/lib/dashboard/validation";
import { dashboardSummarySchema } from "@/lib/dashboard/types";

export async function getDashboardSummary(filters: DashboardFilters) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_summary", {
    from_date: filters.from,
    to_date: filters.to,
    currency_filter: filters.currency,
  });
  if (error || !data) throw new Error("DASHBOARD_UNAVAILABLE");
  const parsed = dashboardSummarySchema.safeParse(data);
  if (!parsed.success) throw new Error("INVALID_DASHBOARD_SNAPSHOT");
  return parsed.data;
}
