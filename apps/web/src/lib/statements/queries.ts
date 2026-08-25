import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type PortfolioFilters,
  type StatementFilters,
} from "@/lib/statements/validation";
import { statementSchema } from "@/lib/statements/types";

export async function listClientAccounts(filters: PortfolioFilters) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_client_accounts", {
    search_query: filters.q || undefined,
    currency_filter: filters.currency,
    balance_filter: filters.balance,
    sort_by: filters.sort,
    sort_direction: filters.direction,
    page_number: filters.page,
    page_size: filters.pageSize,
  });
  if (error) throw new Error("ACCOUNT_PORTFOLIO_UNAVAILABLE");
  return data ?? [];
}

export async function listClientStatementCurrencies(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_account_summary")
    .select("currency_code")
    .eq("client_id", clientId)
    .order("currency_code");
  if (error) throw new Error("STATEMENT_CURRENCIES_UNAVAILABLE");
  return [...new Set((data ?? []).flatMap((row) => row.currency_code ?? []))];
}

export async function getClientStatement(
  clientId: string,
  filters: StatementFilters,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_statement", {
    target_client_id: clientId,
    currency_filter: filters.currency,
    from_date: filters.from,
    to_date: filters.to,
  });
  if (error || !data) throw new Error("STATEMENT_UNAVAILABLE");
  const parsed = statementSchema.safeParse(data);
  if (!parsed.success) throw new Error("INVALID_STATEMENT_SNAPSHOT");
  return parsed.data;
}

export async function recordStatementGenerated(
  clientId: string,
  filters: StatementFilters,
  correlationId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_client_statement_generated", {
    target_client_id: clientId,
    currency_filter: filters.currency,
    from_date: filters.from,
    to_date: filters.to,
    operation_correlation_id: correlationId,
  });
  if (error) throw new Error("STATEMENT_AUDIT_UNAVAILABLE");
}
