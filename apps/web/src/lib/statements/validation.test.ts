import { describe, expect, it } from "vitest";

import {
  buildStatementFilename,
  defaultStatementFilters,
  oneYearBefore,
  portfolioFilterSchema,
  resolveStatementFilters,
} from "./validation";
import { agingLabels, statementSchema } from "./types";

describe("statement filters", () => {
  it("uses a documented rolling twelve-month period", () => {
    expect(
      defaultStatementFilters("HNL", new Date("2026-08-25T18:00:00Z")),
    ).toEqual({ from: "2025-08-25", to: "2026-08-25", currency: "HNL" });
    expect(oneYearBefore("2024-02-29")).toBe("2023-02-28");
  });

  it("rejects invalid and reversed date ranges", () => {
    expect(
      resolveStatementFilters({ from: "2026-02-30", to: "2026-08-25" }),
    ).toMatchObject({ success: false });
    expect(
      resolveStatementFilters({ from: "2026-08-26", to: "2026-08-25" }),
    ).toMatchObject({ success: false });
  });

  it("whitelists portfolio sorting and pagination", () => {
    const parsed = portfolioFilterSchema.parse({
      sort: "drop table clients",
      direction: "sideways",
      pageSize: "999",
    });
    expect(parsed).toMatchObject({
      sort: "client_name",
      direction: "asc",
      pageSize: 20,
    });
  });
});

describe("statement presentation", () => {
  it("uses explicit aging labels", () => {
    expect(Object.values(agingLabels)).toEqual([
      "Al corriente",
      "1-30",
      "31-60",
      "61-90",
      "90+",
    ]);
  });

  it("sanitizes PDF filenames", () => {
    expect(buildStatementFilename(" CLI/000 123 ", "2026-08-25")).toBe(
      "Estado-de-Cuenta-CLI-000-123-2026-08-25.pdf",
    );
  });

  it("normalizes a statement view model without floating calculations", () => {
    const parsed = statementSchema.parse({
      client: {
        id: "31000000-0000-0000-0000-000000000001",
        client_code: "CLI-000001",
        full_name: "Cliente sintético",
        email: null,
        phone: null,
        whatsapp: null,
        address: null,
        city: null,
        country: null,
      },
      currency: "HNL",
      period: { from: "2026-01-01", to: "2026-08-25" },
      generated_at: "2026-08-25T12:00:00Z",
      summary: {
        opening_balance: "100.00",
        period_charges: "50.00",
        period_applied_payments: "20.00",
        period_payment_reversals: "0.00",
        period_charge_cancellations: "0.00",
        closing_balance: "130.00",
        total_charged: "150.00",
        total_applied: "20.00",
        outstanding_balance: "130.00",
        overdue_balance: "0.00",
        not_due_balance: "130.00",
        unapplied_credit: "10.00",
        is_delinquent: false,
      },
      aging: {
        current: "130.00",
        "1_30": 0,
        "31_60": 0,
        "61_90": 0,
        "90_plus": 0,
        as_of: "2026-08-25",
      },
      open_charges: [],
      movements: [],
    });
    expect(parsed.summary.closing_balance).toBe(130);
    expect(parsed.aging.current).toBe(130);
  });
});
