import { writeFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const password = "Local-E2E-Only!2026";
const clientId = "31000000-0000-0000-0000-000000000001";
const concept = `Cargo E2E ${Date.now()}`;
let paymentUrl = "";
let receiptUrl = "";

async function login(
  page: Page,
  role: "finance" | "admin" | "owner" | "staff",
) {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  if (!email) throw new Error(`Missing local ${role} fixture.`);
  await page.goto("/login");
  await page.getByLabel("Email o usuario").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
}

test.describe.serial("financial role and transaction flows", () => {
  test("finance creates a charge, confirms a payment, and reads its receipt", async ({
    page,
  }) => {
    await login(page, "finance");
    await expect(
      page.getByRole("link", { name: "Cargos" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Pagos" }).first(),
    ).toBeVisible();

    await page.goto(`/admin/cargos/nuevo?client=${clientId}`);
    await page.getByLabel("Concepto").fill(concept);
    await page.locator('input[name="amount"]').fill("250.00");
    await page.getByRole("button", { name: "Registrar cargo" }).click();
    await expect(page).toHaveURL(
      /\/admin\/cargos\/[0-9a-f-]+\?success=created/,
    );
    await expect(page.getByRole("heading", { name: concept })).toBeVisible();

    await page.goto(`/admin/pagos/nuevo?client=${clientId}`);
    await page.locator('input[name="amount"]').fill("250.00");
    await page.getByLabel(`Monto aplicado a ${concept}`).fill("250.00");
    await page
      .getByRole("button", { name: "Revisar y confirmar pago" })
      .click();
    const confirmation = page.getByRole("dialog", {
      name: "¿Confirmar este pago?",
    });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Confirmar pago" }).click();
    await expect(page).toHaveURL(
      /\/admin\/recibos\/[0-9a-f-]+\?success=confirmed/,
    );
    receiptUrl = new URL(page.url()).pathname;
    await expect(page.getByText(/^REC-\d{6,}$/)).toBeVisible();
    await expect(page.getByText(concept)).toBeVisible();
    const backLink = page.getByRole("link", { name: "Volver al pago" });
    paymentUrl = (await backLink.getAttribute("href")) ?? "";
    expect(paymentUrl).toMatch(/^\/admin\/pagos\/[0-9a-f-]+$/);
  });

  test("owner voids the confirmed payment without deleting its receipt", async ({
    page,
  }) => {
    await login(page, "owner");
    await page.goto(paymentUrl);
    await page.getByRole("button", { name: "Anular pago" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Anular este pago?" });
    await dialog
      .getByLabel("Motivo")
      .fill("Corrección controlada de prueba E2E");
    await dialog.getByRole("button", { name: "Confirmar anulación" }).click();
    await expect(page.getByText("Pago anulado correctamente.")).toBeVisible();
    await expect(
      page.getByText("Anulado", { exact: true }).first(),
    ).toBeVisible();
    await page.goto(receiptUrl);
    await expect(
      page.getByRole("heading", { name: "Recibo anulado" }),
    ).toBeVisible();
  });

  test("staff cannot see or open financial modules", async ({ page }) => {
    await login(page, "staff");
    await expect(page.getByRole("link", { name: "Cargos" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pagos" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Estados de cuenta" }),
    ).toHaveCount(0);
    await page.goto("/admin/cargos");
    await expect(page).toHaveURL(/\/access-denied/);
    await page.goto(paymentUrl);
    await expect(page).toHaveURL(/\/access-denied/);
    await page.goto(receiptUrl);
    await expect(page).toHaveURL(/\/access-denied/);
    await page.goto(`/admin/clientes/${clientId}?tab=estado-cuenta`);
    await expect(page).toHaveURL(/\/access-denied/);
    const pdfResponse = await page.request.get(
      `/admin/clientes/${clientId}/estado-cuenta/pdf?from=2025-01-01&to=2026-12-31&currency=HNL`,
    );
    expect(pdfResponse.status()).toBe(403);
  });

  test("finance, admin, and owner can use statements and finance can generate a PDF", async ({
    page,
  }, testInfo) => {
    for (const role of ["finance", "admin", "owner"] as const) {
      await login(page, role);
      await page.goto("/admin/estados-de-cuenta");
      await expect(
        page.getByRole("heading", { name: "Estados de cuenta" }),
      ).toBeVisible();
      await page.goto(`/admin/clientes/${clientId}?tab=estado-cuenta`);
      await expect(
        page.getByRole("heading", { name: /Resumen financiero/ }),
      ).toBeVisible();
    }

    await login(page, "finance");
    await page.goto(
      `/admin/clientes/${clientId}?tab=estado-cuenta&from=2025-01-01&to=2026-12-31&currency=HNL`,
    );
    const pdfLink = page.getByRole("link", { name: "Descargar PDF" });
    await expect(pdfLink).toBeVisible();
    const href = await pdfLink.getAttribute("href");
    expect(href).toBeTruthy();
    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["content-disposition"]).toMatch(
      /Estado-de-Cuenta-CLI-\d+-2026-12-31\.pdf/,
    );
    const body = await response.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    const pdfPath = testInfo.outputPath("statement.pdf");
    await writeFile(pdfPath, body);
    await testInfo.attach("statement-pdf", {
      path: pdfPath,
      contentType: "application/pdf",
    });
  });

  test("financial routes have no horizontal overflow at required widths", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    await login(page, "finance");
    const viewports = [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 820, height: 1180 },
      { width: 1024, height: 768 },
      { width: 1366, height: 900 },
      { width: 1440, height: 900 },
    ];
    const routes = [
      ["cargos", "/admin/cargos"],
      ["pagos", "/admin/pagos"],
      ["nuevo-pago", `/admin/pagos/nuevo?client=${clientId}`],
      ["recibo", receiptUrl],
      ["cartera", "/admin/estados-de-cuenta"],
      ["estado-cuenta", `/admin/clientes/${clientId}?tab=estado-cuenta`],
      [
        "estado-cuenta-imprimir",
        `/admin/clientes/${clientId}/estado-cuenta/imprimir?from=2025-01-01&to=2026-12-31&currency=HNL`,
      ],
    ] as const;
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [name, route] of routes) {
      await page.goto(route);
      // npm and pnpm may resolve Axe's wide playwright-core peer differently;
      // the runtime Page contract used here is compatible in both installers.
      const scan = await new AxeBuilder({ page: page as never }).analyze();
      const blocking = scan.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );
      expect(blocking, `${name} axe violations`).toEqual([]);
    }
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const [name, route] of routes) {
        await page.goto(route);
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(
          dimensions.scrollWidth,
          `${name} at ${viewport.width}px`,
        ).toBeLessThanOrEqual(dimensions.clientWidth);
        await page.screenshot({
          path: testInfo.outputPath(`${name}-${viewport.width}.png`),
          fullPage: true,
          caret: "initial",
        });
      }
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/admin/pagos/nuevo?client=${clientId}`);
    const amount = page.locator('input[name="amount"]');
    await amount.fill("1.00");
    await amount.focus();
    const reviewButton = page.getByRole("button", {
      name: "Revisar y confirmar pago",
    });
    await expect(reviewButton).toBeVisible();
    const touchTargets = await page.getByRole("button").evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const style = getComputedStyle(button);
          return style.display !== "none" && style.visibility !== "hidden";
        })
        .map((button) => {
          const box = button.getBoundingClientRect();
          return { name: button.textContent?.trim(), height: box.height };
        }),
    );
    for (const target of touchTargets) {
      expect(
        target.height,
        `${target.name} touch height`,
      ).toBeGreaterThanOrEqual(44);
    }
    await reviewButton.click();
    const dialog = page.getByRole("dialog", { name: "¿Confirmar este pago?" });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        left: box.left,
        right: box.right,
        bottom: box.bottom,
        width: innerWidth,
        height: innerHeight,
      };
    });
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    await dialog.getByRole("button", { name: "Volver" }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/clientes/${clientId}?tab=estado-cuenta`);
    await expect(
      page.getByRole("link", { name: "Descargar PDF" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Movimientos del período" }),
    ).toBeVisible();
  });
});
