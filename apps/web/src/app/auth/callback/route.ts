import { NextResponse } from "next/server";

import { toSafeInternalPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const destination = toSafeInternalPath(
    requestUrl.searchParams.get("next"),
    "/admin",
  );

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(new URL(destination, requestUrl));
    } catch {
      // Return a generic failure below; no provider details are exposed.
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", requestUrl));
}
