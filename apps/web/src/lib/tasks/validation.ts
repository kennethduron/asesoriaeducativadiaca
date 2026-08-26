import { z } from "zod";

export const taskPriorities = ["low", "normal", "high", "urgent"] as const;
export const taskStatuses = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

const optionalUuid = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().uuid().optional(),
);

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(4000).optional(),
    client_id: optionalUuid,
    client_service_id: optionalUuid,
    assigned_to: z.string().uuid(),
    priority: z.enum(taskPriorities),
    due_local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    reminder_minutes: z.array(z.coerce.number().int().min(0).max(10080)).max(8),
    custom_remind_local: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        .optional(),
    ),
    channel_push: z.boolean(),
    channel_email: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.client_service_id && !value.client_id)
      context.addIssue({
        code: "custom",
        path: ["client_service_id"],
        message: "Selecciona el cliente del servicio.",
      });
    if (value.reminder_minutes.length + (value.custom_remind_local ? 1 : 0) > 8)
      context.addIssue({
        code: "custom",
        path: ["reminder_minutes"],
        message: "Puedes configurar hasta ocho recordatorios.",
      });
    if (
      (value.reminder_minutes.length || value.custom_remind_local) &&
      !value.channel_push &&
      !value.channel_email
    )
      context.addIssue({
        code: "custom",
        path: ["reminder_minutes"],
        message: "Selecciona al menos un canal.",
      });
    if (
      value.custom_remind_local &&
      new Date(`${value.custom_remind_local}:00-06:00`) >
        new Date(`${value.due_local}:00-06:00`)
    )
      context.addIssue({
        code: "custom",
        path: ["custom_remind_local"],
        message: "El recordatorio no puede ser posterior al vencimiento.",
      });
  });

export function dueAtFromHondurasLocal(value: string) {
  const parsed = new Date(`${value}:00-06:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("INVALID_DUE_AT");
  return parsed.toISOString();
}

export function parseTaskForm(formData: FormData) {
  const reminderMinutes = formData
    .getAll("reminder_minutes")
    .map(String)
    .filter(Boolean);
  return taskFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    client_id: formData.get("client_id"),
    client_service_id: formData.get("client_service_id"),
    assigned_to: formData.get("assigned_to"),
    priority: formData.get("priority"),
    due_local: formData.get("due_local"),
    reminder_minutes: reminderMinutes,
    custom_remind_local: formData.get("custom_remind_local"),
    channel_push: formData.get("channel_push") === "on",
    channel_email: formData.get("channel_email") === "on",
  });
}

export const taskListSchema = z.object({
  scope: z
    .enum(["mine", "all", "today", "upcoming", "overdue", "completed"])
    .default("mine"),
  status: z.enum(taskStatuses).optional(),
  q: z.string().trim().max(160).default(""),
  client: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [20, 50, 100].includes(value))
    .default(20),
});
