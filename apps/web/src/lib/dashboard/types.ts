import { z } from "zod";

const amount = z.coerce.number();

export const dashboardSummarySchema = z.object({
  period: z.object({
    from: z.string(),
    to: z.string(),
    previous_from: z.string(),
    previous_to: z.string(),
    timezone: z.literal("America/Tegucigalpa"),
  }),
  permissions: z.object({
    clients: z.boolean(),
    services: z.boolean(),
    financial: z.boolean(),
  }),
  clients: z
    .object({
      active: z.coerce.number(),
      new_current: z.coerce.number(),
      new_previous: z.coerce.number(),
    })
    .nullable(),
  services: z
    .object({
      active: z.coerce.number(),
      by_category: z.array(
        z.object({
          category_id: z.string(),
          category: z.string(),
          count: z.coerce.number(),
        }),
      ),
    })
    .nullable(),
  financial: z
    .object({
      currency: z.string(),
      billed: z.object({ current: amount, previous: amount }),
      collected: z.object({ current: amount, previous: amount }),
      outstanding: amount,
      overdue: amount,
      unapplied_credit: amount,
      delinquent_clients: z.coerce.number(),
      aging: z.object({
        current: amount,
        "1_30": amount,
        "31_60": amount,
        "61_90": amount,
        "90_plus": amount,
      }),
      granularity: z.enum(["day", "month"]),
      series: z.array(
        z.object({ date: z.string(), billed: amount, collected: amount }),
      ),
      top_overdue: z.array(
        z.object({
          client_id: z.string(),
          client_code: z.string(),
          client_name: z.string(),
          currency_code: z.string(),
          overdue_balance: amount,
          oldest_due_date: z.string().nullable(),
          days_overdue: z.coerce.number(),
        }),
      ),
    })
    .nullable(),
  recent_activity: z.array(
    z.object({
      type: z.string(),
      label: z.string(),
      detail: z.string(),
      occurred_at: z.string(),
      href: z.string(),
    }),
  ),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export function toChartSeries(summary: DashboardSummary) {
  return (summary.financial?.series ?? []).map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat("es-HN", {
      timeZone: "UTC",
      day: summary.financial?.granularity === "day" ? "2-digit" : undefined,
      month: "short",
      year: summary.financial?.granularity === "month" ? "2-digit" : undefined,
    }).format(new Date(`${point.date}T00:00:00Z`)),
  }));
}
