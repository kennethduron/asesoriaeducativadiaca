"use client";

import { createBrowserClient } from "@supabase/ssr";

import {
  getSupabaseConfig,
  SUPABASE_AUTH_COOKIE_OPTIONS,
} from "@/lib/supabase/env";
import type { Database } from "@/types/database.generated";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseConfig();
    browserClient = createBrowserClient<Database>(url, publishableKey, {
      cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
    });
  }

  return browserClient;
}
