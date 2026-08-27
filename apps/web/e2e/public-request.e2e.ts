import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const password = "Local-E2E-Only!2026";
const service = createClient(
  process.env.E2E_SUPABASE_URL!,
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const runId = `${Date.now()}-${process.pid}`;
const syntheticEmail = `public.request.${runId}@example.invalid`;
const retryEmail = `public.retry.${runId}@example.invalid`;

async function eligibleRecipientIds() {
  const { data: roles } = await service
    .from("roles")
    .select("id")
    .in("code", ["owner", "admin"]);
  const { data: profiles } = await service
    .from("profiles")
    .select("id")
    .eq("status", "active")
    .in(
      "role_id",
      (roles ?? []).map((role) => role.id),
    );
  return (profiles ?? []).map((profile) => profile.id).sort();
}

test.afterAll(async () => {
  await service
    .from("public_requests")
    .delete()
    .in("email", [syntheticEmail, retryEmail]);
});

test("public form persists, confirms success and exposes the CRM detail", async ({
  page,
}) => {
  await page.goto("/contacto");
  await page.getByLabel("Nombre completo").fill("Solicitud Sintética E2E");
  await page.getByLabel("Correo electrónico").fill(syntheticEmail);
  await page.getByLabel("Teléfono (opcional)").fill("+504 9999-0000");
  await page.getByLabel("Tipo de servicio").selectOption("Asesoría académica");
  await page
    .getByLabel("Detalle de la solicitud")
    .fill("Fixture controlado para validar el flujo público.");
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/leads"),
  );
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  const submitResponse = await responsePromise;
  expect({
    status: submitResponse.status(),
    body: await submitResponse.json(),
  }).toEqual({ status: 201, body: { ok: true } });
  await expect(page.locator(".request-status")).toContainText(
    "Solicitud enviada correctamente",
  );

  let stored: { id: string } | null = null;
  await expect
    .poll(async () => {
      const result = await service
        .from("public_requests")
        .select("id")
        .eq("email", syntheticEmail)
        .maybeSingle();
      stored = result.data;
      return Boolean(stored);
    })
    .toBe(true);

  const { data: deliveries } = await service
    .from("public_request_notification_deliveries")
    .select("channel,recipient_user_id,status")
    .eq("request_id", stored!.id);
  const expectedRecipients = await eligibleRecipientIds();
  const emailRecipients = (deliveries ?? [])
    .filter((item) => item.channel === "email")
    .map((item) => item.recipient_user_id)
    .sort();
  expect(emailRecipients).toEqual(expectedRecipients);
  expect(emailRecipients).not.toContain(process.env.E2E_FINANCE_ID);
  expect(emailRecipients).not.toContain(process.env.E2E_STAFF_ID);

  await page.goto("/login");
  await page.getByLabel("Email o usuario").fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
  await page.goto(`/admin/solicitudes/${stored!.id}`);
  await expect(
    page.getByRole("heading", { name: "Solicitud Sintética E2E" }),
  ).toBeVisible();
  await expect(page.getByText(syntheticEmail)).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("the same HTTP idempotency key creates and notifies once", async ({
  page,
}) => {
  await page.goto("/");
  const idempotencyKey = crypto.randomUUID();
  const payload = {
    name: "Retry Sintético E2E",
    email: retryEmail,
    phone: "",
    service: "Redacción profesional",
    priority: "Normal",
    message: "Retry controlado",
    organization_site: "",
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await page.request.post("/api/leads", {
      headers: {
        origin: new URL(page.url()).origin,
        "idempotency-key": idempotencyKey,
      },
      data: payload,
    });
    expect(response.status()).toBe(201);
  }
  const { data: requests } = await service
    .from("public_requests")
    .select("id")
    .eq("email", retryEmail);
  expect(requests).toHaveLength(1);
  const { data: deliveries } = await service
    .from("public_request_notification_deliveries")
    .select("channel,recipient_key,recipient_user_id")
    .eq("request_id", requests![0].id);
  const deliveryKeys = (deliveries ?? []).map(
    (item) => `${item.channel}:${item.recipient_key}`,
  );
  expect(new Set(deliveryKeys).size).toBe(deliveryKeys.length);
  expect(
    (deliveries ?? [])
      .filter((item) => item.channel === "email")
      .map((item) => item.recipient_user_id)
      .sort(),
  ).toEqual(await eligibleRecipientIds());
});

for (const width of [375, 390, 430, 768, 820, 1024, 1366, 1440]) {
  test(`public contact form is responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.goto("/contacto");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const button = page.getByRole("button", { name: "Enviar solicitud" });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
}
