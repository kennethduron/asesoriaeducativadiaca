"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toSafeInternalPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

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
