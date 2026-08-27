import { expect, test } from "@playwright/test";

const password = "Local-E2E-Only!2026";

test("email and case-insensitive username authenticate the same owner", async ({
  page,
}) => {
  const email = process.env.E2E_OWNER_EMAIL;
  if (!email) throw new Error("Missing local owner fixture.");

  await page.goto("/login");
  await page.getByLabel("Email o usuario").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  const submit = page.getByRole("button", { name: "Ingresar" });
  await submit.click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page
    .getByLabel("Email o usuario")
    .fill(process.env.E2E_OWNER_USERNAME!.toUpperCase());
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
});

test("login errors do not enumerate identifiers", async ({ page }) => {
  await page.goto("/login");
  const identifier = page.getByLabel("Email o usuario");
  const passwordField = page.getByLabel("Contraseña", { exact: true });

  await identifier.fill("unknown-user");
  await passwordField.fill("wrong-password");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByTestId("login-message")).toHaveText(
    "Correo/usuario o contraseña incorrectos.",
  );

  await identifier.fill(process.env.E2E_OWNER_EMAIL!);
  await passwordField.fill("wrong-password");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByTestId("login-message")).toHaveText(
    "Correo/usuario o contraseña incorrectos.",
  );
});

test("password controls preserve the value and expose accessible state", async ({
  page,
}) => {
  await page.goto("/login");
  const field = page.getByLabel("Contraseña", { exact: true });
  await field.fill("VisibleOnlyForTest");
  await expect(field).toHaveAttribute("type", "password");

  const show = page.getByRole("button", { name: "Mostrar contraseña" });
  await expect(show).toHaveCSS("min-width", "44px");
  await show.click();
  await expect(field).toHaveAttribute("type", "text");
  await expect(field).toHaveValue("VisibleOnlyForTest");
  await expect(field).toBeFocused();
  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  await expect(field).toHaveAttribute("type", "password");
});

test("profile username update is normalized and collision-safe", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email o usuario").fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
  await page.goto("/admin/perfil");
  const username = page.getByLabel("Nombre de usuario");
  const updatedUsername = `owneru_${Date.now().toString().slice(-10)}`;
  await username.fill(updatedUsername.toUpperCase());
  await page.getByRole("button", { name: "Guardar nombre de usuario" }).click();
  await expect(page.getByText("Nombre de usuario actualizado.")).toBeVisible();
  await expect(username).toHaveValue(updatedUsername);
});

test("auth pages remain responsive at required widths", async ({ page }) => {
  for (const width of [375, 390, 430, 768, 820, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 850 : 900 });
    for (const route of [
      "/login",
      "/restablecer-contrasena",
      "/admin/perfil",
    ]) {
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
});
