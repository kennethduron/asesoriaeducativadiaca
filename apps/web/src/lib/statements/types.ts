import { z } from "zod";

const amount = z.union([
  z.number(),
  z
    .string()
    .regex(/^-?\d+(?:\.\d+)?$/)
    .transform(Number),
]);
const nullableAmount = amount.nullable().transform((value) => value ?? 0);
const databaseUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const statementSchema = z.object({
  client: z.object({
    id: databaseUuid,
    client_code: z.string(),
    full_name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
  }),
  currency: z.string().regex(/^[A-Z]{3}$/),
  period: z.object({ from: z.string(), to: z.string() }),
  generated_at: z.string(),
  summary: z.object({
    opening_balance: nullableAmount,
    period_charges: nullableAmount,
    period_applied_payments: nullableAmount,
    period_payment_reversals: nullableAmount,
    period_charge_cancellations: nullableAmount,
    closing_balance: nullableAmount,
    total_charged: nullableAmount,
    total_applied: nullableAmount,
    outstanding_balance: nullableAmount,
    overdue_balance: nullableAmount,
    not_due_balance: nullableAmount,
    unapplied_credit: nullableAmount,
    is_delinquent: z.boolean(),
  }),
  aging: z.object({
    current: nullableAmount,
    "1_30": nullableAmount,
    "31_60": nullableAmount,
    "61_90": nullableAmount,
    "90_plus": nullableAmount,
    as_of: z.string(),
  }),
  open_charges: z.array(
    z.object({
      charge_id: databaseUuid,
      concept: z.string(),
      charge_date: z.string(),
      due_date: z.string().nullable(),
      original_amount: amount,
      applied_amount: amount,
      remaining_amount: amount,
      days_overdue: z.number(),
      aging_bucket: z.string(),
      status: z.string(),
    }),
  ),
  movements: z.array(
    z.object({
      event_key: z.string(),
      source_id: databaseUuid,
      date: z.string(),
      type: z.string(),
      reference: z.string(),
      description: z.string(),
      debit: amount,
      credit: amount,
      applied_amount: amount.nullable(),
      unapplied_amount: amount.nullable(),
      receipt_id: databaseUuid.nullable(),
      running_balance: amount,
    }),
  ),
});

export type ClientStatement = z.infer<typeof statementSchema>;

export const agingLabels = {
  current: "Al corriente",
  "1_30": "1-30",
  "31_60": "31-60",
  "61_90": "61-90",
  "90_plus": "90+",
} as const;

export const movementLabels: Record<string, string> = {
  charge: "Cargo",
  payment: "Pago",
  payment_void: "Reversión",
  charge_cancelled: "Cancelación",
};
