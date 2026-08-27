"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { sendUserInvitationEmail } from "@/lib/notifications/resend";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getAbsoluteUrl } from "@/lib/site-url";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import { buildUserInvitationEmail } from "@/lib/users/invitation-email";
import {
  inviteUserSchema,
  updateUserAccessSchema,
} from "@/lib/users/validation";

export async function inviteUserAction(formData: FormData) {
  const principal = await requirePermission("users.manage");
  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
  });
  if (!parsed.success) redirect("/admin/usuarios?error=invalid-invite");

  const normalizedEmail = parsed.data.email.toLowerCase();
  const limit = await consumeRateLimit({
    scope: "admin.user_invitation",
    subject: principal.id,
    windowSeconds: 3600,
    maxRequests: 10,
  }).catch(() => null);
  if (!limit?.allowed) redirect("/admin/usuarios?error=invite-rate-limited");

  const privileged = createPrivilegedClient();
  const supabase = await createClient();
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id,name")
    .eq("code", parsed.data.role)
    .eq("is_active", true)
    .single();
  if (roleError || !role) redirect("/admin/usuarios?error=role-missing");

  const authUsers = await privileged.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authUsers.error) redirect("/admin/usuarios?error=invite-failed");
  const existingUser = authUsers.data.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail,
  );
  if (existingUser?.email_confirmed_at)
    redirect("/admin/usuarios?error=user-exists");

  let invitationId: string | null = null;
  try {
    const claim = await privileged.rpc("claim_user_invitation", {
      invite_actor: principal.id,
      invite_email: normalizedEmail,
      invite_full_name: parsed.data.full_name,
      invite_role_id: role.id,
    });
    const invitation = claim.data?.[0];
    if (claim.error || !invitation) throw new Error("INVITATION_CLAIM_FAILED");
    invitationId = invitation.invitation_id;

    const generated = await privileged.auth.admin.generateLink({
      type: "invite",
      email: normalizedEmail,
      options: {
        data: { full_name: parsed.data.full_name },
        redirectTo: getAbsoluteUrl("/aceptar-invitacion"),
      },
    });
    if (
      generated.error ||
      !generated.data.user ||
      !generated.data.properties?.hashed_token
    )
      throw new Error("INVITATION_LINK_FAILED");

    const attached = await privileged.rpc("attach_user_invitation", {
      target_invitation_id: invitationId,
      target_user_id: generated.data.user.id,
    });
    if (attached.error) throw new Error("INVITATION_PROFILE_FAILED");

    const invitationUrl = new URL(getAbsoluteUrl("/aceptar-invitacion"));
    invitationUrl.searchParams.set(
      "token_hash",
      generated.data.properties.hashed_token,
    );
    invitationUrl.searchParams.set("type", "invite");
    const content = buildUserInvitationEmail({
      fullName: parsed.data.full_name,
      roleName: role.name,
      invitationUrl: invitationUrl.toString(),
    });
    const messageId = await sendUserInvitationEmail({
      recipient: normalizedEmail,
      invitationId,
      attempt: invitation.invitation_attempt,
      ...content,
    });
    const recorded = await privileged.rpc("record_user_invitation_delivery", {
      target_invitation_id: invitationId,
      delivery_status: "sent",
      message_id: messageId ?? undefined,
      failure_code: undefined,
    });
    if (recorded.error) throw new Error("INVITATION_DELIVERY_AUDIT_FAILED");
  } catch (error) {
    if (invitationId) {
      const failureCode =
        error instanceof Error
          ? error.message.slice(0, 120)
          : "INVITATION_FAILED";
      await privileged.rpc("record_user_invitation_delivery", {
        target_invitation_id: invitationId,
        delivery_status: "failed",
        message_id: undefined,
        failure_code: failureCode,
      });
    }
    redirect("/admin/usuarios?error=invite-failed");
  }

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
