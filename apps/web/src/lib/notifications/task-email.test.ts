import { describe, expect, it } from "vitest";
import { buildTaskReminderEmail } from "./task-email";

describe("task reminder email", () => {
  it("escapes user content and keeps the server-selected task URL", () => {
    const result = buildTaskReminderEmail({
      title: '<img src=x onerror="alert(1)">',
      priority: "urgent",
      dueAt: "2026-08-30T16:00:00.000Z",
      taskUrl: "https://preview.example/admin/tareas/abc",
    });
    expect(result.html).not.toContain("<img");
    expect(result.html).toContain("&lt;img");
    expect(result.html).toContain("https://preview.example/admin/tareas/abc");
    expect(result.html).toContain("Urgente");
  });
});
