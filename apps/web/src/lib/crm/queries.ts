import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ClientListInput } from "@/lib/crm/validation";

export type ClientListRow = {
  id: string;
  client_code: string;
  full_name: string;
  client_type: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: string;
  registered_on: string;
  active_services_count: number;
  total_count: number;
};

export async function listClients(filters: ClientListInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_clients", {
    search_query: filters.q || undefined,
    status_filter: filters.status,
    sort_by: filters.sort,
    sort_direction: filters.direction,
    page_number: filters.page,
    page_size: filters.pageSize,
  });
  if (error) throw new Error("CLIENT_LIST_UNAVAILABLE");
  return (data ?? []) as ClientListRow[];
}

export async function getClient(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("CLIENT_UNAVAILABLE");
  return data;
}

export async function getClientServices(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_services")
    .select("*, service_catalog(name, service_categories(name))")
    .eq("client_id", clientId)
    .order("start_date", { ascending: false })
    .limit(50);
  if (error) throw new Error("CLIENT_SERVICES_UNAVAILABLE");
  return data ?? [];
}

export async function getClientNotes(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_notes", {
    target_client_id: clientId,
    result_limit: 30,
  });
  if (error) throw new Error("CLIENT_NOTES_UNAVAILABLE");
  return data ?? [];
}

export async function getClientActivity(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_activity", {
    target_client_id: clientId,
    result_limit: 30,
  });
  if (error) throw new Error("CLIENT_ACTIVITY_UNAVAILABLE");
  return data ?? [];
}

export async function listServiceCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw new Error("SERVICE_CATEGORIES_UNAVAILABLE");
  return data ?? [];
}

export async function listServiceCatalog(activeOnly = false) {
  const supabase = await createClient();
  let query = supabase
    .from("service_catalog")
    .select("*, service_categories(name, code)")
    .order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error("SERVICE_CATALOG_UNAVAILABLE");
  return data ?? [];
}

export async function getCatalogService(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_catalog")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("SERVICE_UNAVAILABLE");
  return data;
}
