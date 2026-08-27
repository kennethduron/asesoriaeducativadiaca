import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PublicRequestRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  priority: string;
  message: string;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export async function listPublicRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_requests")
    .select(
      "id,name,email,phone,service,priority,message,status,source,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("PUBLIC_REQUEST_LIST_UNAVAILABLE");
  return (data ?? []) as PublicRequestRow[];
}

export async function getPublicRequest(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_requests")
    .select(
      "id,name,email,phone,service,priority,message,status,source,created_at,updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("PUBLIC_REQUEST_UNAVAILABLE");
  return data as PublicRequestRow | null;
}
