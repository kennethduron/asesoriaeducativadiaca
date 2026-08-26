import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = "Local-E2E-Only!2026";
const title = `Seguimiento F7 ${Date.now()}`;
let taskPath = "";

async function login(
  page: Page,
  role: "owner" | "admin" | "finance" | "staff",
) {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  if (!email) throw new Error(`Missing local ${role} fixture.`);
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
}

test.describe.serial("tasks and reminders", () => {
  test("admin creates and assigns a reminder task to staff", async ({
    page,
  }) => {
    await login(page, "admin");
    await page.goto("/admin/tareas/nueva");
    await page.getByLabel("Título").fill(title);
    await page
      .getByLabel("Descripción")
      .fill("Fixture local controlado de Fase 7");
    const staffValue = process.env.E2E_STAFF_ID;
    expect(staffValue).toBeTruthy();
    await page.getByLabel("Responsable").selectOption(staffValue!);
    await page.getByLabel("Prioridad").selectOption("high");
    await page.getByLabel(/Fecha y hora ·/).fill("2026-12-15T10:00");
    await page.getByText("1 día antes", { exact: true }).click();
    await page.getByText("Email", { exact: true }).click();
    await page.getByRole("button", { name: "Crear tarea" }).click();
    await expect(page).toHaveURL(
      /\/admin\/tareas\/[0-9a-f-]+\?success=created/,
    );
    taskPath = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(/Email/)).toBeVisible();
  });

  test("staff sees its assigned task and completes it", async ({ page }) => {
    await login(page, "staff");
    await page.goto("/admin/tareas?scope=mine");
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.goto(taskPath);
    await page.getByRole("button", { name: "Completar" }).click();
    await expect(page.getByText(/Marcar esta tarea/)).toBeVisible();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Completada", { exact: true })).toBeVisible();
  });

  test("finance cannot enumerate or open an unrelated task", async ({
    page,
  }) => {
    await login(page, "finance");
    await page.goto("/admin/tareas?scope=mine");
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    const response = await page.request.get(taskPath);
    expect(response.status()).toBe(404);
  });

  test("owner manages all tasks and task pages stay responsive and accessible", async ({
    page,
  }) => {
    await login(page, "owner");
    const routes = ["/admin/tareas?scope=all", taskPath, "/admin/tareas/nueva"];
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      const scan = await new AxeBuilder({ page: page as never }).analyze();
      expect(
        scan.violations.filter((item) =>
          ["serious", "critical"].includes(item.impact ?? ""),
        ),
      ).toEqual([]);
    }
    for (const width of [375, 390, 430, 768, 820, 1024, 1366, 1440]) {
      await page.setViewportSize({ width, height: width < 700 ? 900 : 1000 });
      for (const route of routes) {
        await page.goto(route);
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(
          dimensions.scrollWidth,
          `${route} at ${width}px`,
        ).toBeLessThanOrEqual(dimensions.clientWidth);
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/admin/tareas/nueva");
    const controls = await page
      .locator(
        "main button, main a, main input:not([type=checkbox]):not([type=radio]), main select, main label:has(input[type=checkbox]), main label:has(input[type=radio])",
      )
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              (element as HTMLElement).offsetParent !== null
            );
          })
          .map((element) => ({
            name: element.getAttribute("name") ?? element.textContent?.trim(),
            height: element.getBoundingClientRect().height,
          })),
      );
    for (const control of controls)
      expect(
        control.height,
        `${control.name} touch height`,
      ).toBeGreaterThanOrEqual(44);
  });
});
