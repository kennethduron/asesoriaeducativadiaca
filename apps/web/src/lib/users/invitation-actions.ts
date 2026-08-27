"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { consumeRateLimit, requestSubject } from "@/lib/security/rate-limit";
import { confirmedPasswordSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

const invitationTokenSchema = z.object({
  token_hash: z.string().trim().min(20).max(1024),
  type: z.literal("invite"),
});

export type InvitationState = {
  status?: "error";
  message?: string;
};

export async function confirmUserInvitation(formData: FormData) {
  const parsed = invitationTokenSchema.safeParse({
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
  });
  if (!parsed.success) redirect("/aceptar-invitacion?error=invalid");

  let errorCode: "expired" | "invalid" | "rate-limited" | "used" | null = null;
  try {
    const requestHeaders = await headers();
    const limit = await consumeRateLimit({
      scope: "auth.user_invitation",
      subject: requestSubject(requestHeaders),
      windowSeconds: 900,
      maxRequests: 8,
    });
    if (!limit.allowed) errorCode = "rate-limited";

    if (!errorCode) {
      const supabase = await createClient();
      const { error: verificationError } = await supabase.auth.verifyOtp({
        token_hash: parsed.data.token_hash,
        type: "invite",
      });
      if (verificationError) {
        errorCode = "expired";
      } else {
        const { data, error } = await supabase.rpc("get_my_user_invitation");
        const invitation = data?.[0];
        if (
          error ||
          !invitation ||
          invitation.invitation_status !== "pending"
        ) {
          await supabase.auth.signOut({ scope: "local" });
          errorCode = "used";
        }
      }
    }
  } catch {
    errorCode = "invalid";
  }

  if (errorCode) redirect(`/aceptar-invitacion?error=${errorCode}`);
  redirect("/aceptar-invitacion");
}

export async function completeUserInvitation(
  _state: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const parsed = confirmedPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message:
        parsed.error.issues.find((issue) => issue.path[0] === "confirmation")
          ?.message ?? "La contraseña debe tener al menos 8 caracteres.",
    };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return {
        status: "error",
        message: "La sesión de invitación expiró. Solicita un nuevo enlace.",
      };

    const invitationResult = await supabase.rpc("get_my_user_invitation");
    const invitation = invitationResult.data?.[0];
    if (
      invitationResult.error ||
      !invitation ||
      invitation.invitation_status !== "pending"
    )
      return {
        status: "error",
        message: "Esta invitación ya no está disponible.",
      };

    const { error: passwordError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (passwordError)
      return {
        status: "error",
        message: "No pudimos guardar la contraseña. Inténtalo nuevamente.",
      };

    const { error: completionError } = await supabase.rpc(
      "complete_user_invitation",
    );
    if (completionError)
      return {
        status: "error",
        message: "No pudimos activar la cuenta. Inténtalo nuevamente.",
      };

    await supabase.rpc("record_auth_event", {
      event_action: "auth.password.changed",
      event_correlation_id: randomUUID(),
    });
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    return {
      status: "error",
      message: "No pudimos completar la cuenta. Inténtalo nuevamente.",
    };
  }

  redirect("/aceptar-invitacion?success=created");
}
