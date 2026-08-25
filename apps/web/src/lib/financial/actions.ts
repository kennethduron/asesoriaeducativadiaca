"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import type { FormState } from "@/lib/crm/form-state";
import {
  cancellationSchema,
  chargeSchema,
  paymentSchema,
} from "@/lib/financial/validation";
import { normalizeMoney } from "@/lib/financial/money";
import { createClient } from "@/lib/supabase/server";

function fields(formData: FormData, names: readonly string[]) {
  return Object.fromEntries(
    names.map((name) => [name, formData.get(name) ?? ""]),
  );
}

function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): FormState {
  const fieldErrors = error.flatten().fieldErrors;
  const firstError = Object.values(fieldErrors).flat()[0];
  return {
    status: "error",
    message: firstError
      ? `Revisa los campos señalados. ${firstError}`
      : "Revisa los campos señalados.",
    fieldErrors,
  };
}

const financialError = (message: string): FormState => ({
  status: "error",
  message,
});

export async function createChargeAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("charges.write");
  const parsed = chargeSchema.safeParse(
    fields(formData, [
      "client_id",
      "client_service_id",
      "concept",
      "charge_date",
      "due_date",
      "amount",
      "currency_code",
      "reference",
      "notes",
    ]),
  );
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charges")
    .insert({
      ...parsed.data,
      amount: parsed.data.amount as unknown as number,
      created_by: principal.id,
      updated_by: principal.id,
    })
    .select("id")
    .single();
  if (error || !data) return financialError("No pudimos registrar el cargo.");
  revalidatePath("/admin/cargos");
  revalidatePath(`/admin/clientes/${parsed.data.client_id}`);
  redirect(`/admin/cargos/${data.id}?success=created`);
}

export async function cancelChargeAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("charges.cancel");
  const parsed = cancellationSchema.safeParse({
    id: formData.get("charge_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_charge", {
    target_charge_id: parsed.data.id,
    reason: parsed.data.reason,
  });
  if (error) {
    if (/active payments/i.test(error.message))
      return financialError(
        "Este cargo tiene pagos aplicados y no puede cancelarse directamente.",
      );
    return financialError("No pudimos cancelar el cargo.");
  }
  revalidatePath("/admin/cargos");
  revalidatePath(`/admin/cargos/${parsed.data.id}`);
  redirect(`/admin/cargos/${parsed.data.id}?success=cancelled`);
}

export async function confirmPaymentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const principal = await requirePermission("payments.create");
  if (!principal.permissions.has("payments.confirm"))
    return financialError("No tienes permiso para confirmar pagos.");
  const parsed = paymentSchema.safeParse(
    fields(formData, [
      "client_id",
      "payment_date",
      "amount",
      "currency_code",
      "payment_method_id",
      "reference_number",
      "bank_name",
      "notes",
      "idempotency_key",
      "allocations_json",
    ]),
  );
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const paymentInsert = {
    client_id: parsed.data.client_id,
    payment_date: parsed.data.payment_date,
    amount: parsed.data.amount as unknown as number,
    currency_code: parsed.data.currency_code,
    payment_method_id: parsed.data.payment_method_id,
    reference_number: parsed.data.reference_number,
    bank_name: parsed.data.bank_name,
    notes: parsed.data.notes,
    idempotency_key: parsed.data.idempotency_key,
    created_by: principal.id,
  };
  let paymentId: string | undefined;
  const { data: inserted, error: insertError } = await supabase
    .from("payments")
    .insert(paymentInsert)
    .select("id")
    .single();
  if (inserted) paymentId = inserted.id;
  if (insertError) {
    const { data: existing } = await supabase
      .from("payments")
      .select("id,client_id,amount,currency_code,payment_method_id,created_by")
      .eq("idempotency_key", parsed.data.idempotency_key)
      .maybeSingle();
    if (
      !existing ||
      existing.created_by !== principal.id ||
      existing.client_id !== parsed.data.client_id ||
      normalizeMoney(String(existing.amount)) !==
        normalizeMoney(parsed.data.amount) ||
      existing.currency_code !== parsed.data.currency_code ||
      existing.payment_method_id !== parsed.data.payment_method_id
    )
      return financialError("No pudimos crear el borrador del pago.");
    paymentId = existing.id;
  }
  if (!paymentId)
    return financialError("No pudimos crear el borrador del pago.");

  const { data, error } = await supabase.rpc("confirm_payment", {
    target_payment_id: paymentId,
    allocations_payload: parsed.data.allocations,
    operation_key: parsed.data.idempotency_key,
  });
  if (error || !data?.[0]) {
    if (
      /balance|clients do not match|currencies do not match|cancelled/i.test(
        error?.message ?? "",
      )
    ) {
      revalidatePath(`/admin/pagos/nuevo`);
      return financialError(
        "El saldo de uno o más cargos cambió. Actualizamos la información para que puedas revisar el pago antes de confirmarlo.",
      );
    }
    if (/different request/i.test(error?.message ?? ""))
      return financialError(
        "Esta clave de operación ya fue utilizada con datos distintos. Recarga el formulario.",
      );
    return financialError(
      "No pudimos confirmar el pago. El borrador quedó disponible para revisión.",
    );
  }
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/cargos");
  revalidatePath(`/admin/clientes/${parsed.data.client_id}`);
  redirect(`/admin/recibos/${data[0].receipt_id}?success=confirmed`);
}

export async function voidPaymentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("payments.void");
  const parsed = cancellationSchema.safeParse({
    id: formData.get("payment_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("void_payment", {
    target_payment_id: parsed.data.id,
    reason: parsed.data.reason,
  });
  if (error)
    return financialError(
      /Only confirmed/i.test(error.message)
        ? "El pago ya cambió de estado. Actualiza la página."
        : "No pudimos anular el pago.",
    );
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/cargos");
  revalidatePath(`/admin/pagos/${parsed.data.id}`);
  redirect(`/admin/pagos/${parsed.data.id}?success=voided`);
}
