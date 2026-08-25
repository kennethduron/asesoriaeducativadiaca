import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/crm/queries";
import type {
  ChargeListInput,
  PaymentListInput,
} from "@/lib/financial/validation";

export async function listFinancialClients(q = "") {
  return listClients({
    q,
    status: "active",
    sort: "full_name",
    direction: "asc",
    page: 1,
    pageSize: 100,
  });
}

export async function listCharges(filters: ChargeListInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_charges", {
    search_query: filters.q || undefined,
    client_filter: filters.client,
    status_filter: filters.status,
    currency_filter: filters.currency,
    date_from: filters.from ?? undefined,
    date_to: filters.to ?? undefined,
    due_before: filters.due ?? undefined,
    page_number: filters.page,
    page_size: filters.pageSize,
  });
  if (error) throw new Error("CHARGE_LIST_UNAVAILABLE");
  return data ?? [];
}

export async function getCharge(id: string) {
  const supabase = await createClient();
  const [{ data: charge, error }, { data: balance, error: balanceError }] =
    await Promise.all([
      supabase
        .from("charges")
        .select(
          "*, clients(client_code,full_name), client_services(custom_description,service_catalog(name))",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("charge_balances")
        .select("allocated_amount,remaining_amount,derived_status")
        .eq("charge_id", id)
        .maybeSingle(),
    ]);
  if (error || balanceError) throw new Error("CHARGE_UNAVAILABLE");
  return charge && balance ? { ...charge, balance } : null;
}

export async function getClientServicesForCharge(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_services")
    .select(
      "id,agreed_price,currency_code,custom_description,service_catalog(name)",
    )
    .eq("client_id", clientId)
    .in("status", ["pending", "active", "completed"])
    .order("start_date", { ascending: false });
  if (error) throw new Error("CLIENT_SERVICES_UNAVAILABLE");
  return data ?? [];
}

export async function listPaymentMethods() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id,code,name")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error("PAYMENT_METHODS_UNAVAILABLE");
  return data ?? [];
}

export async function listPayments(filters: PaymentListInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_payments", {
    search_query: filters.q || undefined,
    client_filter: filters.client,
    status_filter: filters.status,
    method_filter: filters.method,
    date_from: filters.from ?? undefined,
    date_to: filters.to ?? undefined,
    page_number: filters.page,
    page_size: filters.pageSize,
  });
  if (error) throw new Error("PAYMENT_LIST_UNAVAILABLE");
  return data ?? [];
}

export async function getOpenCharges(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_balances")
    .select(
      "charge_id,concept,charge_date,due_date,remaining_amount,currency_code,derived_status",
    )
    .eq("client_id", clientId)
    .gt("remaining_amount", 0)
    .neq("derived_status", "cancelled")
    .order("charge_date");
  if (error) throw new Error("OPEN_CHARGES_UNAVAILABLE");
  return data ?? [];
}

export async function getPayment(id: string) {
  const supabase = await createClient();
  const [{ data: payment, error }, { data: activity, error: activityError }] =
    await Promise.all([
      supabase
        .from("payments")
        .select(
          "*, clients(client_code,full_name), payment_methods(name), payment_allocations(id,amount,reversed_at,charges(id,concept,currency_code)), receipts(id,receipt_number,status)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.rpc("get_payment_activity", {
        target_payment_id: id,
        result_limit: 30,
      }),
    ]);
  if (error || activityError) throw new Error("PAYMENT_UNAVAILABLE");
  return payment ? { ...payment, activity: activity ?? [] } : null;
}

export async function getReceipt(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("RECEIPT_UNAVAILABLE");
  return data;
}

export async function getClientCharges(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_balances")
    .select(
      "charge_id,concept,charge_date,due_date,original_amount,allocated_amount,remaining_amount,currency_code,derived_status",
    )
    .eq("client_id", clientId)
    .order("charge_date", { ascending: false })
    .limit(30);
  if (error) throw new Error("CLIENT_CHARGES_UNAVAILABLE");
  return data ?? [];
}

export async function getClientPayments(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id,payment_date,amount,currency_code,status,receipts(id,receipt_number)",
    )
    .eq("client_id", clientId)
    .order("payment_date", { ascending: false })
    .limit(30);
  if (error) throw new Error("CLIENT_PAYMENTS_UNAVAILABLE");
  return data ?? [];
}
