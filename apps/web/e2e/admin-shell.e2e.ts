import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = "Local-E2E-Only!2026";

async function loginAsOwner(page: Page) {
  const email = process.env.E2E_OWNER_EMAIL;
  if (!email) throw new Error("Missing local owner fixture.");
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
}

const routes = [
  ["inicio", "/admin", "Inicio"],
  ["clientes", "/admin/clientes", "Clientes"],
  ["servicios", "/admin/servicios", "Servicios"],
  ["tareas", "/admin/tareas", "Tareas"],
  ["cargos", "/admin/cargos", "Cargos"],
  ["pagos", "/admin/pagos", "Pagos"],
  ["estados", "/admin/estados-de-cuenta", "Estados de cuenta"],
  ["reportes", "/admin/reportes", "Reportes"],
  ["usuarios", "/admin/usuarios", "Usuarios"],
] as const;

test.describe("professional admin shell", () => {
  test.beforeEach(async ({ page }) => loginAsOwner(page));

  test("marks the current module on index and nested routes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [, route, label] of routes) {
      await page.goto(route);
      const current = page
        .getByRole("navigation", { name: "Navegación administrativa" })
        .getByRole("link", { name: label, exact: true });
      await expect(current).toHaveAttribute("aria-current", "page");
      if (route !== "/admin") {
        await expect(
          page
            .getByRole("navigation", { name: "Navegación administrativa" })
            .getByRole("link", { name: "Inicio", exact: true }),
        ).not.toHaveAttribute("aria-current", "page");
      }
    }

    await page.goto("/admin/clientes/nuevo");
    await expect(
      page
        .getByRole("navigation", { name: "Navegación administrativa" })
        .getByRole("link", { name: "Clientes", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("collapses the desktop sidebar and persists only that visual preference", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/admin");
    const collapse = page.getByRole("button", {
      name: "Colapsar menú lateral",
    });
    await collapse.click();
    await expect(
      page.getByRole("button", { name: "Expandir menú lateral" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("diaca:admin-sidebar-collapsed"),
        ),
      )
      .toBe("true");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Expandir menú lateral" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Expandir menú lateral" }).click();
  });

  test("mobile drawer closes by X, Escape, overlay and navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    const trigger = page.getByRole("button", { name: "Abrir menú" });

    await trigger.click();
    const drawer = page.getByRole("dialog", {
      name: "Navegación administrativa",
    });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Cerrar menú" }).click();
    await expect(drawer).toBeHidden();

    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.locator('[data-slot="sheet-overlay"]').click({
      position: { x: 385, y: 420 },
    });
    await expect(drawer).toBeHidden();

    await trigger.click();
    await drawer.getByRole("link", { name: "Clientes", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/clientes/);
    await expect(drawer).toBeHidden();
  });

  test("all required routes are accessible and have no unintended overflow", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [name, route] of routes) {
      await page.goto(route);
      const scan = await new AxeBuilder({ page: page as never }).analyze();
      expect(
        scan.violations.filter((item) =>
          ["serious", "critical"].includes(item.impact ?? ""),
        ),
        `${name} axe violations`,
      ).toEqual([]);
    }

    for (const width of [375, 390, 430, 768, 820, 1024, 1366, 1440]) {
      await page.setViewportSize({
        width,
        height: width < 700 ? 900 : width < 1100 ? 1000 : 900,
      });
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
      }
      await page.goto("/admin");
      await page.screenshot({
        path: testInfo.outputPath(`admin-${width}.png`),
        fullPage: true,
        caret: "initial",
      });
    }
  });
});
