"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  categorySchema,
  clientSchema,
  clientServiceSchema,
  noteSchema,
  serviceSchema,
} from "@/lib/crm/validation";
import type { FormState } from "@/lib/crm/form-state";

function fields(formData: FormData, names: readonly string[]) {
  return Object.fromEntries(
    names.map((name) => [name, formData.get(name) ?? ""]),
  );
}

function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): FormState {
  return {
    status: "error",
    message: "Revisa los campos señalados.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

const clientFields = [
  "full_name",
  "client_type",
  "email",
  "phone",
  "whatsapp",
  "address",
  "city",
  "country",
  "status",
  "registered_on",
  "notes_summary",
] as const;

export async function createClientAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("clients.write");
  const parsed = clientSchema.safeParse(fields(formData, clientFields));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseClient();
  if (formData.get("confirm_duplicate") !== "yes") {
    const { data: duplicates, error: duplicateError } = await supabase.rpc(
      "find_client_duplicates",
      {
        email_candidate: parsed.data.email ?? undefined,
        phone_candidate: parsed.data.phone ?? undefined,
        whatsapp_candidate: parsed.data.whatsapp ?? undefined,
      },
    );
    if (duplicateError)
      return {
        status: "error",
        message: "No pudimos comprobar posibles duplicados.",
      };
    if (duplicates?.length) {
      return {
        status: "warning",
        message:
          "Encontramos datos de contacto coincidentes. Revísalos y confirma si son clientes distintos.",
        duplicates,
      };
    }
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...parsed.data,
      created_by: principal.id,
      updated_by: principal.id,
    })
    .select("id")
    .single();
  if (error || !data)
    return { status: "error", message: "No pudimos registrar el cliente." };

  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${data.id}?success=created`);
}

export async function updateClientAction(
  clientId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("clients.write");
  const parsed = clientSchema.safeParse(fields(formData, clientFields));
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "");
  if (!parsed.success) return invalid(parsed.error);
  if (!expectedUpdatedAt)
    return { status: "error", message: "Recarga la página antes de guardar." };

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ ...parsed.data, updated_by: principal.id })
    .eq("id", clientId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id")
    .maybeSingle();
  if (error)
    return { status: "error", message: "No pudimos guardar los cambios." };
  if (!data)
    return {
      status: "error",
      message:
        "El cliente cambió en otra sesión. Recarga antes de volver a guardar.",
    };

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);
  redirect(`/admin/clientes/${clientId}?success=updated`);
}

export async function setClientStatusAction(formData: FormData) {
  const principal = await requirePermission("clients.write");
  const clientId = String(formData.get("client_id") ?? "");
  const status = formData.get("status");
  if (
    !/^[0-9a-f-]{36}$/i.test(clientId) ||
    (status !== "active" && status !== "inactive")
  )
    return;
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({ status, updated_by: principal.id })
    .eq("id", clientId);
  if (!error) {
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${clientId}`);
  }
}

export async function addClientNoteAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("clients.write");
  const parsed = noteSchema.safeParse(fields(formData, ["client_id", "note"]));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("client_notes")
    .insert({ ...parsed.data, created_by: principal.id });
  if (error) return { status: "error", message: "No pudimos agregar la nota." };
  revalidatePath(`/admin/clientes/${parsed.data.client_id}`);
  redirect(`/admin/clientes/${parsed.data.client_id}?tab=notes&success=note`);
}

export async function addClientServiceAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("services.write");
  const parsed = clientServiceSchema.safeParse(
    fields(formData, [
      "client_id",
      "service_id",
      "custom_description",
      "start_date",
      "end_date",
      "agreed_price",
      "currency_code",
      "billing_mode",
      "status",
    ]),
  );
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("client_services").insert({
    ...parsed.data,
    created_by: principal.id,
    updated_by: principal.id,
  });
  if (error)
    return { status: "error", message: "No pudimos agregar el servicio." };
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${parsed.data.client_id}`);
  redirect(
    `/admin/clientes/${parsed.data.client_id}?tab=services&success=service`,
  );
}

export async function createCategoryAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("services.write");
  const parsed = categorySchema.safeParse(
    fields(formData, ["code", "name", "description", "sort_order"]),
  );
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("service_categories")
    .insert(parsed.data);
  if (error)
    return { status: "error", message: "No pudimos crear la categoría." };
  revalidatePath("/admin/servicios");
  redirect("/admin/servicios?success=category");
}

export async function createServiceAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("services.write");
  const parsed = serviceSchema.safeParse(
    fields(formData, [
      "category_id",
      "name",
      "description",
      "standard_price",
      "currency_code",
    ]),
  );
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("service_catalog").insert({
    ...parsed.data,
    created_by: principal.id,
    updated_by: principal.id,
  });
  if (error)
    return { status: "error", message: "No pudimos crear el servicio." };
  revalidatePath("/admin/servicios");
  redirect("/admin/servicios?success=service");
}

export async function updateServiceAction(
  serviceId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("services.write");
  const parsed = serviceSchema.safeParse(
    fields(formData, [
      "category_id",
      "name",
      "description",
      "standard_price",
      "currency_code",
    ]),
  );
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("service_catalog")
    .update({ ...parsed.data, updated_by: principal.id })
    .eq("id", serviceId);
  if (error)
    return { status: "error", message: "No pudimos actualizar el servicio." };
  revalidatePath("/admin/servicios");
  redirect("/admin/servicios?success=updated");
}

export async function toggleServiceStatusAction(formData: FormData) {
  const principal = await requirePermission("services.write");
  const serviceId = String(formData.get("service_id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(serviceId)) return;
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("service_catalog")
    .update({ is_active: isActive, updated_by: principal.id })
    .eq("id", serviceId);
  if (!error) revalidatePath("/admin/servicios");
}

export async function toggleCategoryStatusAction(formData: FormData) {
  await requirePermission("services.write");
  const categoryId = String(formData.get("category_id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(categoryId)) return;
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("service_categories")
    .update({ is_active: isActive })
    .eq("id", categoryId);
  if (!error) revalidatePath("/admin/servicios");
}
