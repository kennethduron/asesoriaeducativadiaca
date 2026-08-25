"use client";

import { createBrowserClient } from "@supabase/ssr";

import {
  getSupabaseConfig,
  SUPABASE_AUTH_COOKIE_OPTIONS,
} from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseConfig();
    browserClient = createBrowserClient(url, publishableKey, {
      cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
    });
  }

  return browserClient;
}
