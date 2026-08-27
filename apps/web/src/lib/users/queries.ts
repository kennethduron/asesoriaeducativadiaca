import "server-only";

import { requirePermission } from "@/lib/auth/authorization";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";

export async function listManagedUsers() {
  await requirePermission("users.manage");
  const supabase = await createClient();
  const privileged = createPrivilegedClient();
  const [profilesResult, rolesResult, authResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,username,status,role_id")
      .order("full_name"),
    supabase
      .from("roles")
      .select("id,code,name")
      .eq("is_active", true)
      .order("name"),
    privileged.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (profilesResult.error || rolesResult.error || authResult.error)
    throw new Error("USER_DIRECTORY_UNAVAILABLE");

  const authById = new Map(
    authResult.data.users.map((user) => [user.id, user] as const),
  );
  const roleById = new Map(
    (rolesResult.data ?? []).map((role) => [role.id, role] as const),
  );
  return {
    roles: rolesResult.data ?? [],
    users: (profilesResult.data ?? []).map((profile) => {
      const authUser = authById.get(profile.id);
      const role = roleById.get(profile.role_id);
      return {
        id: profile.id,
        email: authUser?.email ?? "Email no disponible",
        emailConfirmed: Boolean(authUser?.email_confirmed_at),
        fullName: profile.full_name,
        username: profile.username,
        status: profile.status,
        roleCode: role?.code ?? "staff",
        roleName: role?.name ?? "Staff",
      };
    }),
  };
}
