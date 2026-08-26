import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";
import type { taskListSchema } from "@/lib/tasks/validation";

export type TaskListRow = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  client_name: string | null;
  assigned_to: string;
  assigned_name: string;
  created_by: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  due_at: string;
  is_overdue: boolean;
  reminder_count: number;
  total_count: number;
};

export async function listTasks(filters: z.infer<typeof taskListSchema>) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_tasks", {
    scope_filter: filters.scope,
    status_filter: filters.status,
    search_query: filters.q || undefined,
    client_filter: filters.client,
    page_number: filters.page,
    page_size: filters.pageSize,
  });
  if (error) throw new Error("TASK_LIST_UNAVAILABLE");
  return (data ?? []) as TaskListRow[];
}

export async function getTask(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_task_detail", {
    target_task_id: id,
  });
  if (error) throw new Error("TASK_UNAVAILABLE");
  return data?.[0] ?? null;
}

export async function getTaskReminders(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_reminders")
    .select(
      "id,remind_at,relative_minutes,channel_push,channel_email,status,attempt_count,sent_at",
    )
    .eq("task_id", taskId)
    .order("remind_at");
  if (error) throw new Error("TASK_REMINDERS_UNAVAILABLE");
  return data ?? [];
}

export async function getTaskFormOptions() {
  const supabase = await createClient();
  const [assignees, clients, services] = await Promise.all([
    supabase.rpc("get_task_assignees"),
    supabase
      .from("clients")
      .select("id,client_code,full_name")
      .eq("status", "active")
      .order("full_name")
      .limit(200),
    supabase
      .from("client_services")
      .select("id,client_id,service_catalog(name)")
      .in("status", ["pending", "active", "suspended"])
      .order("start_date", { ascending: false })
      .limit(500),
  ]);
  if (assignees.error || clients.error || services.error)
    throw new Error("TASK_OPTIONS_UNAVAILABLE");
  return {
    assignees: assignees.data ?? [],
    clients: clients.data ?? [],
    services: services.data ?? [],
  };
}

export async function listClientTasks(clientId: string, canManage = false) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_tasks", {
    scope_filter: canManage ? "all" : "mine",
    client_filter: clientId,
    page_number: 1,
    page_size: 50,
  });
  if (error) throw new Error("CLIENT_TASKS_UNAVAILABLE");
  return (data ?? []) as TaskListRow[];
}
