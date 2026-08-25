import { z } from "zod";

import { canonicalizeAllocations, moneyPattern } from "./money";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);
const optionalDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .transform((value) => value || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const databaseUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const money = z
  .string()
  .trim()
  .regex(moneyPattern, "Escribe un monto positivo con máximo dos decimales.")
  .refine(
    (value) => !/^0+(?:\.0{1,2})?$/.test(value),
    "El monto debe ser mayor que cero.",
  );
const currency = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

export const chargeSchema = z
  .object({
    client_id: databaseUuid,
    client_service_id: z
      .union([z.literal(""), databaseUuid])
      .transform((value) => value || null),
    concept: z.string().trim().min(1, "Escribe el concepto.").max(200),
    charge_date: date,
    due_date: optionalDate,
    amount: money,
    currency_code: currency,
    reference: optionalText(120),
    notes: optionalText(1000),
  })
  .refine(({ charge_date, due_date }) => !due_date || due_date >= charge_date, {
    path: ["due_date"],
    message: "El vencimiento no puede ser anterior a la fecha del cargo.",
  });

export const allocationSchema = z.object({
  charge_id: databaseUuid,
  amount: money,
});

export const paymentSchema = z
  .object({
    client_id: databaseUuid,
    payment_date: date,
    amount: money,
    currency_code: currency,
    payment_method_id: databaseUuid,
    reference_number: optionalText(120),
    bank_name: optionalText(120),
    notes: optionalText(1000),
    idempotency_key: databaseUuid,
    allocations_json: z.string(),
  })
  .transform((value, context) => {
    try {
      const raw = JSON.parse(value.allocations_json) as unknown;
      const parsed = z.array(allocationSchema).safeParse(raw);
      if (!parsed.success) throw new Error("INVALID_ALLOCATIONS");
      const allocations = canonicalizeAllocations(parsed.data);
      if (
        new Set(allocations.map((item) => item.charge_id)).size !==
        allocations.length
      )
        throw new Error("DUPLICATE_CHARGE");
      return { ...value, allocations };
    } catch {
      context.addIssue({
        code: "custom",
        path: ["allocations_json"],
        message: "Revisa la distribución del pago.",
      });
      return z.NEVER;
    }
  });

export const cancellationSchema = z.object({
  id: databaseUuid,
  reason: z.string().trim().min(3, "Explica el motivo.").max(500),
});

export const chargeListSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  client: databaseUuid.optional().catch(undefined),
  status: z
    .enum(["pending", "partial", "paid", "cancelled"])
    .optional()
    .catch(undefined),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional()
    .catch(undefined),
  from: optionalDate.catch(null),
  to: optionalDate.catch(null),
  due: optionalDate.catch(null),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(20), z.literal(50), z.literal(100)]))
    .catch(20),
});

export const paymentListSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  client: databaseUuid.optional().catch(undefined),
  status: z.enum(["draft", "confirmed", "voided"]).optional().catch(undefined),
  method: databaseUuid.optional().catch(undefined),
  from: optionalDate.catch(null),
  to: optionalDate.catch(null),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(20), z.literal(50), z.literal(100)]))
    .catch(20),
});

export const receiptSnapshotSchema = z.object({
  business: z.object({ name: z.string().min(1) }),
  receipt_number: z.string().regex(/^REC-\d{6,}$/),
  client: z.object({
    id: databaseUuid,
    code: z.string().min(1),
    name: z.string().min(1),
  }),
  payment: z.object({
    id: databaseUuid,
    date: date,
    amount: z.union([z.string(), z.number()]),
    currency_code: currency,
    method: z.string().min(1),
    reference: z.string().nullable(),
    allocated_amount: z.union([z.string(), z.number()]),
    unapplied_amount: z.union([z.string(), z.number()]),
  }),
  allocations: z.array(
    z.object({
      charge_id: databaseUuid,
      concept: z.string().min(1),
      amount: z.union([z.string(), z.number()]),
      currency_code: currency,
    }),
  ),
  issued_at: z.string().datetime({ offset: true }),
});

export type ChargeListInput = z.infer<typeof chargeListSchema>;
export type PaymentListInput = z.infer<typeof paymentListSchema>;
