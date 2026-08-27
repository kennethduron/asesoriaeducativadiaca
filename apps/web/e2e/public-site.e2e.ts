import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  { path: "/", heading: "Orientación académica, legal y profesional." },
  { path: "/servicios", heading: "Servicios para avanzar con claridad." },
  { path: "/legal", heading: "Orientación legal civil y documentación." },
  { path: "/contacto", heading: "Envía tu solicitud a DIACA." },
];

const authRoutes = [
  { path: "/login", heading: "Bienvenido" },
  { path: "/recuperar-contrasena", heading: "Recuperar contraseña" },
  { path: "/aceptar-invitacion", heading: "Invitación requerida" },
  { path: "/access-denied", heading: "Acceso denegado" },
];

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

for (const route of [...publicRoutes, ...authRoutes]) {
  test(`${route.path} renders without runtime errors`, async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const response = await page.goto(route.path);

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: route.heading, exact: false }).first(),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /application error|internal server error/i,
    );
    expect(runtimeErrors).toEqual([]);
  });
}

test("client navigation reveals every public page and the contact form", async ({
  page,
}) => {
  await page.goto("/");

  for (const [destination, path] of [
    ["Servicios", "/servicios"],
    ["Legal", "/legal"],
    ["Contacto", "/contacto"],
  ] as const) {
    await Promise.all([
      page.waitForURL(`**${path}`),
      page
        .getByRole("navigation", { name: "Navegación principal" })
        .getByRole("link", { name: destination, exact: true })
        .click(),
    ]);
    const lastReveal = page.locator("[data-reveal]").last();
    await expect(lastReveal).toBeAttached();
    await lastReveal.scrollIntoViewIfNeeded();
    await expect(lastReveal).toBeVisible();
  }

  await expect(page.locator(".request-copy")).toBeVisible();
  await expect(page.locator(".request-form")).toBeVisible();
  await expect(page.getByLabel("Nombre completo")).toBeEditable();
  await expect(
    page.getByRole("button", { name: "Enviar solicitud" }),
  ).toBeVisible();
});

for (const route of publicRoutes) {
  test(`${route.path} has no serious accessibility violations`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route.path);
    const result = await new AxeBuilder({ page }).analyze();
    const serious = result.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact ?? ""),
    );
    expect(serious).toEqual([]);
  });
}

for (const width of [375, 390, 430, 768, 820, 1024, 1366, 1440]) {
  test(`public site is responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });

    for (const route of publicRoutes) {
      await page.goto(route.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(
        overflow,
        `${route.path} overflows at ${width}px`,
      ).toBeLessThanOrEqual(1);
      await expect(page.locator("header.site-header")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("footer.site-footer")).toBeVisible();
      await expect(page.locator(".floating-whatsapp")).toBeVisible();
    }

    if (width <= 1100) {
      await page.getByRole("button", { name: "Abrir menú" }).click();
      await expect(
        page.getByRole("navigation", { name: "Navegación móvil" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("navigation", { name: "Navegación móvil" }),
      ).toBeHidden();
    }
  });
}

test("public links and image assets resolve", async ({ page, request }) => {
  const internalLinks = new Set<string>();
  const imageUrls = new Set<string>();

  for (const route of publicRoutes) {
    await page.goto(route.path);
    const links = await page
      .locator('a[href^="/"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLAnchorElement).href),
      );
    const images = await page
      .locator("img")
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLImageElement).currentSrc),
      );
    links.forEach((href) => internalLinks.add(href));
    images.forEach((src) => imageUrls.add(src));
  }

  for (const url of [...internalLinks, ...imageUrls]) {
    const response = await request.get(url);
    expect(response.status(), url).toBeLessThan(400);
  }
});
