import { describe, expect, it } from "vitest";

import {
  allocateOldest,
  canonicalizeAllocations,
  centsToMoney,
  moneyToCents,
  normalizeMoney,
} from "./money";
import {
  chargeListSchema,
  chargeSchema,
  paymentSchema,
  receiptSnapshotSchema,
} from "./validation";

const uuid = (suffix: string) =>
  `31000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

describe("financial money helpers", () => {
  it("normalizes two-decimal money without floating point math", () => {
    expect(normalizeMoney("001250.5")).toBe("1250.50");
    expect(moneyToCents("1250.50")).toBe(125050n);
    expect(centsToMoney(125050n)).toBe("1250.50");
  });

  it("rejects more than two decimals", () => {
    expect(() => normalizeMoney("10.001")).toThrow("INVALID_MONEY");
  });

  it("allocates oldest balances without exceeding the payment", () => {
    expect(
      allocateOldest("70.00", [
        { id: "a", remaining_amount: "50.00" },
        { id: "b", remaining_amount: "50.00" },
      ]),
    ).toEqual([
      { charge_id: "a", amount: "50.00" },
      { charge_id: "b", amount: "20.00" },
    ]);
  });

  it("canonicalizes allocation order and values", () => {
    expect(
      canonicalizeAllocations([
        { charge_id: "b", amount: "2" },
        { charge_id: "a", amount: "1.5" },
      ]),
    ).toEqual([
      { charge_id: "a", amount: "1.50" },
      { charge_id: "b", amount: "2.00" },
    ]);
  });
});

describe("financial validation", () => {
  it("rejects a due date before charge date", () => {
    expect(
      chargeSchema.safeParse({
        client_id: uuid("1"),
        client_service_id: "",
        concept: "Cargo",
        charge_date: "2026-08-24",
        due_date: "2026-08-23",
        amount: "100",
        currency_code: "HNL",
        reference: "",
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("parses a deterministic payment payload", () => {
    const parsed = paymentSchema.parse({
      client_id: uuid("1"),
      payment_date: "2026-08-24",
      amount: "1000.00",
      currency_code: "hnl",
      payment_method_id: uuid("2"),
      reference_number: "",
      bank_name: "",
      notes: "",
      idempotency_key: uuid("3"),
      allocations_json: JSON.stringify([
        { charge_id: uuid("4"), amount: "700" },
      ]),
    });
    expect(parsed.currency_code).toBe("HNL");
    expect(parsed.allocations[0].amount).toBe("700.00");
  });

  it("rejects duplicate allocation lines", () => {
    const base = {
      client_id: uuid("1"),
      payment_date: "2026-08-24",
      amount: "1000.00",
      currency_code: "HNL",
      payment_method_id: uuid("2"),
      reference_number: "",
      bank_name: "",
      notes: "",
      idempotency_key: uuid("3"),
      allocations_json: JSON.stringify([
        { charge_id: uuid("4"), amount: "500" },
        { charge_id: uuid("4"), amount: "500" },
      ]),
    };
    expect(paymentSchema.safeParse(base).success).toBe(false);
  });

  it("falls back to safe list filters", () => {
    const parsed = chargeListSchema.parse({
      status: "drop table",
      page: "-1",
      pageSize: "999",
    });
    expect(parsed).toMatchObject({ page: 1, pageSize: 20 });
    expect(parsed.status).toBeUndefined();
  });

  it("accepts the immutable receipt presentation contract", () => {
    const parsed = receiptSnapshotSchema.parse({
      business: { name: "Asesoría Educativa DIACA" },
      receipt_number: "REC-000001",
      client: { id: uuid("1"), code: "DEV-001", name: "Cliente sintético" },
      payment: {
        id: uuid("2"),
        date: "2026-08-24",
        amount: "1000.00",
        currency_code: "HNL",
        method: "Transferencia",
        reference: null,
        allocated_amount: "700.00",
        unapplied_amount: "300.00",
      },
      allocations: [
        {
          charge_id: uuid("3"),
          concept: "Servicio sintético",
          amount: "700.00",
          currency_code: "HNL",
        },
      ],
      issued_at: "2026-08-24T18:00:00+00:00",
    });
    expect(parsed.receipt_number).toBe("REC-000001");
    expect(parsed.payment.unapplied_amount).toBe("300.00");
  });
});
