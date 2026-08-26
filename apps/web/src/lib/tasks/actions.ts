"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/crm/form-state";
import { requirePermission } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import {
  dueAtFromHondurasLocal,
  parseTaskForm,
  taskStatuses,
} from "@/lib/tasks/validation";

function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): FormState {
  return {
    status: "error",
    message: "Revisa los campos señalados.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function createTaskAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("tasks.create");
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return invalid(parsed.error);
  const dueAt = dueAtFromHondurasLocal(parsed.data.due_local);
  const reminders: Array<{
    relative_minutes?: number;
    remind_at?: string;
    push: boolean;
    email: boolean;
  }> = parsed.data.reminder_minutes.map((relative_minutes) => ({
    relative_minutes,
    push: parsed.data.channel_push,
    email: parsed.data.channel_email,
  }));
  if (parsed.data.custom_remind_local)
    reminders.push({
      remind_at: dueAtFromHondurasLocal(parsed.data.custom_remind_local),
      push: parsed.data.channel_push,
      email: parsed.data.channel_email,
    });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_task", {
    task_title: parsed.data.title,
    task_description: parsed.data.description ?? (null as unknown as string),
    task_client_id: parsed.data.client_id ?? (null as unknown as string),
    task_client_service_id:
      parsed.data.client_service_id ?? (null as unknown as string),
    task_assigned_to: parsed.data.assigned_to,
    task_priority: parsed.data.priority,
    task_due_at: dueAt,
    reminder_specs: reminders,
  });
  if (error || !data)
    return { status: "error", message: "No pudimos crear la tarea." };
  revalidatePath("/admin/tareas");
  if (parsed.data.client_id)
    revalidatePath(`/admin/clientes/${parsed.data.client_id}`);
  redirect(`/admin/tareas/${data}?success=created`);
}

export async function updateTaskAction(
  taskId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("tasks.update");
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_task", {
    target_task_id: taskId,
    task_title: parsed.data.title,
    task_description: parsed.data.description ?? (null as unknown as string),
    task_client_id: parsed.data.client_id ?? (null as unknown as string),
    task_client_service_id:
      parsed.data.client_service_id ?? (null as unknown as string),
    task_assigned_to: parsed.data.assigned_to,
    task_priority: parsed.data.priority,
    task_due_at: dueAtFromHondurasLocal(parsed.data.due_local),
  });
  if (error)
    return { status: "error", message: "No pudimos actualizar la tarea." };
  revalidatePath("/admin/tareas");
  revalidatePath(`/admin/tareas/${taskId}`);
  redirect(`/admin/tareas/${taskId}?success=updated`);
}

export async function setTaskStatusAction(formData: FormData) {
  await requirePermission("tasks.complete");
  const taskId = String(formData.get("task_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(taskId) ||
    !(taskStatuses as readonly string[]).includes(status)
  )
    return;
  const supabase = await createClient();
  await supabase.rpc("set_task_status", {
    target_task_id: taskId,
    new_status: status,
  });
  revalidatePath("/admin/tareas");
  revalidatePath(`/admin/tareas/${taskId}`);
}
