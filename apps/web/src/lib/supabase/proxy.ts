import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  getSupabaseConfig,
  SUPABASE_AUTH_COOKIE_OPTIONS,
} from "@/lib/supabase/env";
import { toSafeInternalPath } from "@/lib/auth/safe-redirect";
import type { Database } from "@/types/database.generated";

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        Object.entries(responseHeaders).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(!error && data?.claims?.sub);
  const isProtected =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname === "/access-denied";

  if (isProtected && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      toSafeInternalPath(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
        "/admin",
      ),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname === "/login" && isAuthenticated) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = toSafeInternalPath(
      request.nextUrl.searchParams.get("next"),
      "/admin",
    );
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  return response;
}
