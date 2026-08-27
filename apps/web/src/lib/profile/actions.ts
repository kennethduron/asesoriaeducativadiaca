"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/authorization";
import { confirmedPasswordSchema, usernameSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function updateMyUsername(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  await requireUser();
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Nombre de usuario inválido.",
    };

  const supabase = await createClient();
  const result = await supabase.rpc("update_my_username", {
    requested_username: parsed.data,
  });
  if (result.error) {
    const collision = result.error.code === "23505";
    return {
      status: "error",
      message: collision
        ? "Ese nombre de usuario no está disponible."
        : "No fue posible actualizar el nombre de usuario.",
    };
  }

  revalidatePath("/admin/perfil");
  revalidatePath("/admin/usuarios");
  return { status: "success", message: "Nombre de usuario actualizado." };
}

export async function updateMyPassword(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  await requireUser();
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

  const supabase = await createClient();
  const update = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (update.error)
    return {
      status: "error",
      message: "No fue posible actualizar la contraseña.",
    };

  await supabase.rpc("record_auth_event", {
    event_action: "auth.password.changed",
    event_correlation_id: randomUUID(),
  });
  return { status: "success", message: "Contraseña actualizada." };
}
