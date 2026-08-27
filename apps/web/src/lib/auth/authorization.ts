import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type Principal = {
  id: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  status: "active" | "inactive";
  roleCode: string;
  roleName: string;
  permissions: ReadonlySet<string>;
};

type PrincipalRow = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  status: "active" | "inactive";
  role_code: string;
  role_name: string;
  permission_codes: string[] | null;
};

export const getCurrentPrincipal = cache(
  async (): Promise<Principal | null> => {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data, error } = await supabase.rpc("get_my_principal");
    const row = (data as PrincipalRow[] | null)?.[0];
    if (error || !row || row.user_id !== user.id) return null;

    return {
      id: user.id,
      email: user.email ?? null,
      fullName: row.full_name,
      username: row.username,
      status: row.status,
      roleCode: row.role_code,
      roleName: row.role_name,
      permissions: new Set(row.permission_codes ?? []),
    };
  },
);

export async function requireUser(): Promise<Principal> {
  let principal: Principal | null;
  try {
    principal = await getCurrentPrincipal();
  } catch {
    redirect("/login?error=configuration");
  }

  if (!principal) redirect("/login?next=/admin");
  if (principal.status !== "active") redirect("/access-denied?reason=inactive");
  return principal;
}

export function hasPermission(principal: Principal, permission: string) {
  return principal.permissions.has(permission);
}

export async function requirePermission(permission: string) {
  const principal = await requireUser();
  if (!hasPermission(principal, permission)) redirect("/access-denied");
  return principal;
}
