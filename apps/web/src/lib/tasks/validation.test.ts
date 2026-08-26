import { describe, expect, it } from "vitest";
import {
  dueAtFromHondurasLocal,
  parseTaskForm,
  taskListSchema,
} from "./validation";

function form(overrides: Record<string, string | string[]> = {}) {
  const data = new FormData();
  const values: Record<string, string | string[]> = {
    title: "Seguimiento F7",
    description: "Tarea sintética",
    client_id: "",
    client_service_id: "",
    assigned_to: "80000000-0000-4000-8000-000000000003",
    priority: "normal",
    due_local: "2026-08-30T10:00",
    reminder_minutes: ["15", "60"],
    channel_email: "on",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values))
    for (const item of Array.isArray(value) ? value : [value])
      data.append(key, item);
  return data;
}

describe("task validation", () => {
  it("converts Tegucigalpa wall time into an absolute instant", () => {
    expect(dueAtFromHondurasLocal("2026-08-30T10:00")).toBe(
      "2026-08-30T16:00:00.000Z",
    );
  });
  it("accepts controlled reminders and channels", () => {
    const parsed = parseTaskForm(form());
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reminder_minutes).toEqual([15, 60]);
  });
  it("rejects reminders without a delivery channel", () => {
    expect(
      parseTaskForm(form({ channel_email: "", reminder_minutes: ["15"] }))
        .success,
    ).toBe(false);
  });
  it("accepts a custom Honduras reminder before due time and rejects one after", () => {
    expect(
      parseTaskForm(
        form({ reminder_minutes: [], custom_remind_local: "2026-08-30T09:15" }),
      ).success,
    ).toBe(true);
    expect(
      parseTaskForm(
        form({ reminder_minutes: [], custom_remind_local: "2026-08-30T10:15" }),
      ).success,
    ).toBe(false);
  });
  it("rejects unbounded priorities and invalid client-service relations", () => {
    expect(parseTaskForm(form({ priority: "critical" })).success).toBe(false);
    expect(
      parseTaskForm(
        form({
          client_service_id: "81000000-0000-0000-0000-000000000002",
        }),
      ).success,
    ).toBe(false);
  });
  it("allowlists task filters", () => {
    expect(
      taskListSchema.safeParse({ scope: "overdue", pageSize: 50 }).success,
    ).toBe(true);
    expect(
      taskListSchema.safeParse({ scope: "all;drop table tasks" }).success,
    ).toBe(false);
  });
});
