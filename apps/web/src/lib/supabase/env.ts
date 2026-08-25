export class SupabaseConfigurationError extends Error {
  constructor() {
    super("Supabase development is not configured.");
    this.name = "SupabaseConfigurationError";
  }
}

export const SUPABASE_AUTH_COOKIE_NAME = "diaca-development-auth";

export const SUPABASE_AUTH_COOKIE_OPTIONS = {
  name: SUPABASE_AUTH_COOKIE_NAME,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new SupabaseConfigurationError();
  }

  try {
    new URL(url);
  } catch {
    throw new SupabaseConfigurationError();
  }

  return { url, publishableKey } as const;
}

export function isSupabaseConfigured() {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}
