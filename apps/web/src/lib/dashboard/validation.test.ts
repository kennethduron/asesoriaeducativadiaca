import { describe, expect, it } from "vitest";

import {
  calculateTrend,
  dashboardRange,
  parseDashboardFilters,
} from "./validation";
import { toChartSeries, dashboardSummarySchema } from "./types";

const now = new Date("2026-08-25T18:00:00.000Z");

describe("dashboard periods and comparisons", () => {
  it("uses Tegucigalpa boundaries for built-in periods", () => {
    expect(dashboardRange("today", now)).toEqual({
      from: "2026-08-25",
      to: "2026-08-25",
    });
    expect(dashboardRange("week", now)).toEqual({
      from: "2026-08-24",
      to: "2026-08-25",
    });
    expect(dashboardRange("month", now)).toEqual({
      from: "2026-08-01",
      to: "2026-08-25",
    });
    expect(dashboardRange("previous_month", now)).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
    expect(dashboardRange("last_30_days", now)).toEqual({
      from: "2026-07-27",
      to: "2026-08-25",
    });
    expect(dashboardRange("year", now)).toEqual({
      from: "2026-01-01",
      to: "2026-08-25",
    });
  });

  it("rejects inverted, future, and oversized custom ranges", () => {
    for (const value of [
      { from: "2026-08-26", to: "2026-08-25" },
      { from: "2026-08-25", to: "2026-08-26" },
      { from: "2024-01-01", to: "2026-08-25" },
    ]) {
      expect(
        parseDashboardFilters({ period: "custom", ...value }, now).error,
      ).toBeTruthy();
    }
  });

  it("handles a zero comparison without dividing by zero", () => {
    expect(calculateTrend(10, 0)).toEqual({ kind: "new", value: null });
    expect(calculateTrend(0, 0)).toEqual({ kind: "neutral", value: null });
    expect(calculateTrend(120, 100).value).toBeCloseTo(20);
  });
});

describe("dashboard chart mapping", () => {
  it("preserves billed and collected as separate series", () => {
    const summary = dashboardSummarySchema.parse({
      period: {
        from: "2026-08-01",
        to: "2026-08-25",
        previous_from: "2026-07-07",
        previous_to: "2026-07-31",
        timezone: "America/Tegucigalpa",
      },
      permissions: { clients: true, services: true, financial: true },
      clients: { active: 1, new_current: 1, new_previous: 0 },
      services: { active: 1, by_category: [] },
      financial: {
        currency: "HNL",
        billed: { current: 1000, previous: 0 },
        collected: { current: 400, previous: 0 },
        outstanding: 600,
        overdue: 0,
        unapplied_credit: 0,
        delinquent_clients: 0,
        aging: {
          current: 600,
          "1_30": 0,
          "31_60": 0,
          "61_90": 0,
          "90_plus": 0,
        },
        granularity: "day",
        series: [{ date: "2026-08-25", billed: 1000, collected: 400 }],
        top_overdue: [],
      },
      recent_activity: [],
    });
    expect(toChartSeries(summary)[0]).toMatchObject({
      billed: 1000,
      collected: 400,
    });
  });
});
