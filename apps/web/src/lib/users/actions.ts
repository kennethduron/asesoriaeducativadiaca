"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { getAbsoluteUrl } from "@/lib/site-url";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import {
  inviteUserSchema,
  updateUserAccessSchema,
} from "@/lib/users/validation";

export async function inviteUserAction(formData: FormData) {
  await requirePermission("users.manage");
  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) redirect("/admin/usuarios?error=invalid-invite");

  const privileged = createPrivilegedClient();
  const { error } = await privileged.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name },
      redirectTo: getAbsoluteUrl("/auth/callback?next=/restablecer-contrasena"),
    },
  );
  if (error) redirect("/admin/usuarios?error=invite-failed");

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?success=invited");
}

export async function updateUserAccessAction(formData: FormData) {
  await requirePermission("users.manage");
  const parsed = updateUserAccessSchema.safeParse({
    user_id: formData.get("user_id"),
    role: formData.get("role"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect("/admin/usuarios?error=invalid-access");

  const supabase = await createClient();
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("code", parsed.data.role)
    .eq("is_active", true)
    .single();
  if (roleError || !role) redirect("/admin/usuarios?error=role-missing");

  const { error } = await supabase
    .from("profiles")
    .update({ role_id: role.id, status: parsed.data.status })
    .eq("id", parsed.data.user_id);
  if (error) redirect("/admin/usuarios?error=access-failed");

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?success=access-updated");
}
