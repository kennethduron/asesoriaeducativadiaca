import { describe, expect, it } from "vitest";

import {
  clientListSchema,
  clientSchema,
  clientServiceSchema,
} from "./validation";

describe("CRM validation", () => {
  it("whitelists list sorting and neutralizes injection-like values", () => {
    const parsed = clientListSchema.parse({
      sort: "full_name;drop table clients",
      page: "-4",
    });
    expect(parsed.sort).toBe("registered_on");
    expect(parsed.page).toBe(1);
  });

  it("normalizes optional email without changing phone text", () => {
    const parsed = clientSchema.parse({
      full_name: "Cliente Ejemplo",
      client_type: "individual",
      email: "PRUEBA@EXAMPLE.INVALID",
      phone: "+504 9000-0000",
      whatsapp: "",
      address: "",
      city: "",
      country: "Honduras",
      status: "active",
      registered_on: "2026-08-24",
      notes_summary: "",
    });
    expect(parsed.email).toBe("prueba@example.invalid");
    expect(parsed.phone).toBe("+504 9000-0000");
  });

  it("rejects an end date before the start date", () => {
    const result = clientServiceSchema.safeParse({
      client_id: "31000000-0000-0000-0000-000000000001",
      service_id: "33000000-0000-0000-0000-000000000001",
      custom_description: "",
      start_date: "2026-08-24",
      end_date: "2026-08-23",
      agreed_price: "100",
      currency_code: "hnl",
      billing_mode: "one_time",
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});
