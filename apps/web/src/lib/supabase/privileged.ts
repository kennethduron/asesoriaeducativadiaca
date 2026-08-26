import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createPrivilegedClient() {
  const { url } = getSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY_MISSING");
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
