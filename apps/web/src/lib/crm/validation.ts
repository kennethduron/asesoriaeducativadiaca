import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.");

export const clientSchema = z.object({
  full_name: z.string().trim().min(2, "Escribe el nombre completo.").max(160),
  client_type: z.enum(["individual", "business"]),
  email: z
    .union([z.literal(""), z.email("Escribe un correo válido.")])
    .transform((value) => value.trim().toLowerCase() || null),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  address: optionalText(300),
  city: optionalText(100),
  country: optionalText(100),
  status: z.enum(["active", "inactive"]),
  registered_on: dateString,
  notes_summary: optionalText(1000),
});

export const noteSchema = z.object({
  client_id: z.uuid(),
  note: z.string().trim().min(1, "Escribe una nota.").max(5000),
});

export const clientServiceSchema = z
  .object({
    client_id: z.uuid(),
    service_id: z.uuid(),
    custom_description: optionalText(1000),
    start_date: dateString,
    end_date: z
      .union([z.literal(""), dateString])
      .transform((value) => value || null),
    agreed_price: z
      .union([
        z.literal(""),
        z.coerce.number().positive("El precio debe ser mayor que cero."),
      ])
      .transform((value) => (value === "" ? null : value)),
    currency_code: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase()),
    billing_mode: z
      .union([z.literal(""), z.enum(["one_time", "monthly", "custom"])])
      .transform((value) => value || null),
    status: z.enum([
      "pending",
      "active",
      "suspended",
      "completed",
      "cancelled",
    ]),
  })
  .refine(({ start_date, end_date }) => !end_date || end_date >= start_date, {
    message: "La fecha final no puede ser anterior a la inicial.",
    path: ["end_date"],
  });

export const categorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().trim().min(2).max(120),
  description: optionalText(500),
  sort_order: z.coerce.number().int().min(0).max(10000),
});

export const serviceSchema = z.object({
  category_id: z.uuid(),
  name: z.string().trim().min(2).max(160),
  description: optionalText(1000),
  standard_price: z
    .union([
      z.literal(""),
      z.coerce.number().positive("El precio debe ser mayor que cero."),
    ])
    .transform((value) => (value === "" ? null : value)),
  currency_code: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
});

export const clientListSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  status: z.enum(["active", "inactive"]).optional().catch(undefined),
  sort: z
    .enum(["full_name", "registered_on", "client_code", "status"])
    .catch("registered_on"),
  direction: z.enum(["asc", "desc"]).catch("desc"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(20), z.literal(50), z.literal(100)]))
    .catch(20),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientListInput = z.infer<typeof clientListSchema>;
