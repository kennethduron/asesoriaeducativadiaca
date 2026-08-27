"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toSafeInternalPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { getAbsoluteUrl } from "@/lib/site-url";
import { consumeRateLimit, requestSubject } from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(1024),
  next: z.string().optional(),
});

export type LoginState = {
  message?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      message: "Revisa los datos ingresados.",
      fieldErrors: {
        email: parsed.error.issues.some((issue) => issue.path[0] === "email")
          ? "Ingresa un correo válido."
          : undefined,
        password: parsed.error.issues.some(
          (issue) => issue.path[0] === "password",
        )
          ? "Ingresa tu contraseña."
          : undefined,
      },
    };
  }

  const destination = toSafeInternalPath(parsed.data.next, "/admin");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) return { message: "Correo o contraseña incorrectos." };

    const { data: principalData, error: principalError } =
      await supabase.rpc("get_my_principal");
    const principal = (principalData as Array<{ status: string }> | null)?.[0];
    if (principalError || !principal) {
      await supabase.auth.signOut({ scope: "local" });
      return { message: "No se pudo completar la operación." };
    }

    const requestHeaders = await headers();
    await supabase.rpc("record_auth_event", {
      event_action: "auth.login.success",
      event_correlation_id: randomUUID(),
      event_ip_address: undefined,
      event_user_agent:
        requestHeaders.get("user-agent")?.slice(0, 512) ?? undefined,
    });

    if (principal.status !== "active") {
      await supabase.auth.signOut({ scope: "local" });
      return { message: "Tu acceso administrativo está inactivo." };
    }
  } catch {
    return { message: "El acceso administrativo no está disponible." };
  }

  redirect(destination);
}

export async function logout() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.rpc("record_auth_event", {
        event_action: "auth.logout",
        event_correlation_id: randomUUID(),
        event_ip_address: undefined,
        event_user_agent: undefined,
      });
    }

    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Fail closed: the protected route will validate the session again.
  }

  redirect("/login");
}

const resetRequestSchema = z.object({ email: z.email().trim().max(254) });
const recoveryTokenSchema = z.object({
  token_hash: z.string().trim().min(20).max(1024),
  type: z.literal("recovery"),
});
const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12)
      .max(128)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "Las contraseñas no coinciden.",
  });

export type PasswordState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function requestPasswordReset(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success)
    return { status: "error", message: "Ingresa un correo válido." };
  try {
    const requestHeaders = await headers();
    const limit = await consumeRateLimit({
      scope: "auth.password_reset",
      subject: requestSubject(requestHeaders),
      windowSeconds: 900,
      maxRequests: 3,
    });
    if (!limit.allowed)
      return {
        status: "success",
        message:
          "Si la cuenta existe, recibirá instrucciones para restablecer el acceso.",
      };
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: getAbsoluteUrl("/auth/callback?next=/restablecer-contrasena"),
    });
  } catch {
    // Do not reveal account existence or provider details.
  }
  return {
    status: "success",
    message:
      "Si la cuenta existe, recibirá instrucciones para restablecer el acceso.",
  };
}

export async function confirmPasswordRecovery(formData: FormData) {
  const parsed = recoveryTokenSchema.safeParse({
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
  });
  if (!parsed.success) redirect("/recuperar-contrasena?error=expired");

  let verified = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: parsed.data.token_hash,
      type: parsed.data.type,
    });
    verified = !error;
  } catch {
    verified = false;
  }

  if (!verified) redirect("/recuperar-contrasena?error=expired");
  redirect("/restablecer-contrasena");
}

export async function updatePassword(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Usa al menos 12 caracteres, mayúscula, minúscula, número y símbolo.",
    };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return {
        status: "error",
        message: "El enlace ya no es válido. Solicita uno nuevo.",
      };
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error)
      return {
        status: "error",
        message: "No pudimos actualizar la contraseña.",
      };
    await supabase.rpc("record_auth_event", {
      event_action: "auth.password.changed",
      event_correlation_id: randomUUID(),
    });
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    return { status: "error", message: "No pudimos actualizar la contraseña." };
  }
  redirect("/login?password=updated");
}
