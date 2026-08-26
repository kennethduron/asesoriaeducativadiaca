import { describe, expect, it } from "vitest";

import {
  parseReportFilters,
  parseReportFiltersStrict,
  reportSearchParams,
} from "./validation";

describe("report filter contract", () => {
  it("accepts approved filters and keeps them in URL params", () => {
    const { filters, error } = parseReportFilters("charges", {
      from: "2026-08-01",
      to: "2026-08-25",
      currency: "hnl",
      status: "partial",
      sort: "balance",
      direction: "asc",
      pageSize: "50",
    });
    expect(error).toBeNull();
    expect(filters).toMatchObject({
      currency: "HNL",
      status: "partial",
      sort: "balance",
      direction: "asc",
      pageSize: 50,
    });
    expect(reportSearchParams(filters).get("currency")).toBe("HNL");
  });

  it("resets unsupported sorting and oversized ranges in the page parser", () => {
    expect(
      parseReportFilters("payments", {
        sort: "amount desc; drop table",
        from: "2020-01-01",
        to: "2026-08-25",
      }).error,
    ).toBeTruthy();
  });

  it("rejects unsupported sorting in the strict export parser", () => {
    const params = new URLSearchParams({ sort: "raw_sql" });
    expect(() => parseReportFiltersStrict("aging", params)).toThrow(
      "INVALID_REPORT_SORT",
    );
  });

  it("enforces the 20/50/100 pagination allowlist", () => {
    expect(
      parseReportFilters("clients", { pageSize: "500" }).filters.pageSize,
    ).toBe(20);
  });

  it("allowlists bank report filters and sorting", () => {
    const result = parseReportFilters("bank", {
      q: "BANK-001",
      currency: "usd",
      status: "confirmed",
      sort: "reference",
      direction: "asc",
    });
    expect(result.error).toBeNull();
    expect(result.filters).toMatchObject({
      currency: "USD",
      status: "confirmed",
      sort: "reference",
    });
  });
});
