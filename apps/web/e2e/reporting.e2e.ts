import { writeFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = "Local-E2E-Only!2026";
const reportHeadings = [
  ["clients", "Clientes"],
  ["services", "Servicios"],
  ["charges", "Cargos y facturación"],
  ["payments", "Pagos e ingresos"],
  ["receivables", "Cuentas por cobrar"],
  ["aging", "Morosidad y aging"],
] as const;

async function login(page: Page, role: "finance" | "staff") {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  if (!email) throw new Error(`Missing local ${role} fixture.`);
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
}

test.describe.serial("dashboard and reporting", () => {
  test("finance reads the dashboard, all reports, and real exports", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    const unsolicitedExportRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("request", (request) => {
      if (/\/admin\/reportes\/[^/]+\/(?:excel|pdf)(?:\?|$)/.test(request.url()))
        unsolicitedExportRequests.push(request.url());
    });
    await login(page, "finance");
    await expect(
      page.getByRole("heading", { name: /Bienvenido/ }),
    ).toBeVisible();
    await page.locator('select[name="period"]').selectOption("last_30_days");
    await page.locator('select[name="currency"]').selectOption("HNL");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page).toHaveURL(/period=last_30_days/);
    await expect(page.getByText("Resumen financiero")).toBeVisible();

    await page.goto("/admin/reportes");
    await expect(
      page.getByRole("heading", { name: "Centro de reportes" }),
    ).toBeVisible();
    for (const [type, heading] of reportHeadings) {
      await page.goto(`/admin/reportes/${type}`);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(
        page.locator("p").filter({ hasText: /^\d+ registros$/ }),
      ).toBeVisible();
      await page.locator('select[name="direction"]').selectOption("asc");
      await page.locator('select[name="pageSize"]').selectOption("50");
      await page.getByRole("button", { name: "Aplicar filtros" }).click();
      await expect(page).toHaveURL(/direction=asc/);
      await expect(page).toHaveURL(/pageSize=50/);
    }
    expect(unsolicitedExportRequests).toEqual([]);

    await page.goto("/admin/reportes/charges");
    const excelHref = await page
      .getByRole("link", { name: /Excel/ })
      .getAttribute("href");
    const pdfHref = await page
      .getByRole("link", { name: /PDF/ })
      .getAttribute("href");
    expect(excelHref).toBeTruthy();
    expect(pdfHref).toBeTruthy();

    const excelResponse = await page.request.get(excelHref!);
    expect(excelResponse.status()).toBe(200);
    expect(excelResponse.headers()["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(excelResponse.headers()["cache-control"]).toContain("no-store");
    const excel = await excelResponse.body();
    expect([...excel.subarray(0, 2)]).toEqual([0x50, 0x4b]);
    await writeFile(testInfo.outputPath("charges.xlsx"), excel);

    const pdfResponse = await page.request.get(pdfHref!);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    expect(pdfResponse.headers()["cache-control"]).toContain("no-store");
    const pdf = await pdfResponse.body();
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    await writeFile(testInfo.outputPath("charges.pdf"), pdf);
    expect(consoleErrors).toEqual([]);
  });

  test("staff is denied reports in navigation, pages, and export handlers", async ({
    page,
  }) => {
    await login(page, "staff");
    await expect(page.getByRole("link", { name: "Reportes" })).toHaveCount(0);
    await page.goto("/admin/reportes");
    await expect(page).toHaveURL(/\/access-denied/);
    await page.goto("/admin/reportes/charges");
    await expect(page).toHaveURL(/\/access-denied/);
    const excel = await page.request.get("/admin/reportes/charges/excel");
    const pdf = await page.request.get("/admin/reportes/charges/pdf");
    expect(excel.status()).toBe(403);
    expect(pdf.status()).toBe(403);
  });

  test("dashboard and reports are accessible and responsive at required widths", async ({
    page,
  }, testInfo) => {
    await login(page, "finance");
    const routes = [
      ["dashboard", "/admin"],
      ["reports", "/admin/reportes"],
      ["aging", "/admin/reportes/aging"],
    ] as const;
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [name, route] of routes) {
      await page.goto(route);
      const scan = await new AxeBuilder({ page: page as never }).analyze();
      const blocking = scan.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );
      expect(blocking, `${name} axe violations`).toEqual([]);
    }

    const viewports = [375, 390, 430, 768, 820, 1024, 1366, 1440];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: width < 700 ? 900 : 1000 });
      for (const [name, route] of routes) {
        await page.goto(route);
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(
          dimensions.scrollWidth,
          `${name} at ${width}px`,
        ).toBeLessThanOrEqual(dimensions.clientWidth);
        await page.screenshot({
          path: testInfo.outputPath(`${name}-${width}.png`),
          fullPage: true,
          caret: "initial",
        });
      }
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/admin/reportes/aging");
    await expect(
      page.getByRole("button", { name: "Aplicar filtros" }),
    ).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("link", { name: /Excel/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /PDF/ })).toBeVisible();
  });
});
