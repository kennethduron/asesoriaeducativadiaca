import { describe, expect, it } from "vitest";

import { leadSchema } from "./lead";

const valid = {
  name: "Persona Sintética",
  email: "SYNTHETIC@EXAMPLE.INVALID",
  phone: "",
  service: "Asesoría académica",
  priority: "Normal",
  message: "Consulta controlada",
  organization_site: "",
};

describe("public lead validation", () => {
  it("normalizes email and permits an omitted phone", () => {
    const result = leadSchema.parse(valid);
    expect(result.email).toBe("synthetic@example.invalid");
    expect(result.phone).toBe("");
  });

  it("rejects invalid email and phone values", () => {
    expect(() => leadSchema.parse({ ...valid, email: "invalid" })).toThrow();
    expect(() => leadSchema.parse({ ...valid, phone: "123" })).toThrow();
  });
});
