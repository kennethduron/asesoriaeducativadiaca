import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const invitedPassword = "Invitation-E2E-Only!2026";

test("invitation is explicit, single-use, role-safe and login-ready", async ({
  page,
}) => {
  const url = process.env.E2E_SUPABASE_URL;
  const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.env.E2E_OWNER_ID;
  if (!url || !serviceKey || !ownerId)
    throw new Error("Missing local invitation E2E configuration.");

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `invitation.e2e.${Date.now()}@example.invalid`;
  const invitedUsername = `invited_${Date.now().toString().slice(-10)}`;
  let invitedUserId: string | null = null;

  try {
    const roleResult = await service
      .from("roles")
      .select("id")
      .eq("code", "finance")
      .single();
    if (roleResult.error) throw roleResult.error;

    const claim = await service.rpc("claim_user_invitation", {
      invite_actor: ownerId,
      invite_email: email,
      invite_full_name: "Invitación E2E",
      invite_role_id: roleResult.data.id,
    });
    if (claim.error || !claim.data?.[0])
      throw claim.error ?? new Error("Invitation claim failed.");

    const generated = await service.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { full_name: "Invitación E2E" } },
    });
    if (
      generated.error ||
      !generated.data.user ||
      !generated.data.properties?.hashed_token
    )
      throw generated.error ?? new Error("Invitation link failed.");
    invitedUserId = generated.data.user.id;

    const attached = await service.rpc("attach_user_invitation", {
      target_invitation_id: claim.data[0].invitation_id,
      target_user_id: invitedUserId,
    });
    if (attached.error) throw attached.error;
    const delivered = await service.rpc("record_user_invitation_delivery", {
      target_invitation_id: claim.data[0].invitation_id,
      delivery_status: "sent",
      message_id: "local-e2e-message",
    });
    if (delivered.error) throw delivered.error;

    const invitationUrl = new URL(
      "/aceptar-invitacion",
      "http://127.0.0.1:4173",
    );
    invitationUrl.searchParams.set(
      "token_hash",
      generated.data.properties.hashed_token,
    );
    invitationUrl.searchParams.set("type", "invite");

    await page.goto(invitationUrl.toString());
    await expect(
      page.getByRole("heading", { name: "Aceptar invitación" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Aceptar invitación" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Aceptar invitación y continuar" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Crea tu contraseña" }),
    ).toBeVisible();
    await expect(page.getByText("Finanzas", { exact: true })).toBeVisible();
    await page.getByLabel("Crear contraseña").fill(invitedPassword);
    await page.getByLabel("Confirmar contraseña").fill(invitedPassword);
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await expect(
      page.getByRole("heading", { name: "Cuenta creada correctamente" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Iniciar sesión" }).click();
    await page.getByLabel("Email o usuario").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(invitedPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    await page.goto("/admin/perfil");
    await page.getByLabel("Nombre de usuario").fill(invitedUsername);
    await page
      .getByRole("button", { name: "Guardar nombre de usuario" })
      .click();
    await expect(
      page.getByText("Nombre de usuario actualizado."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page
      .getByLabel("Email o usuario")
      .fill(invitedUsername.toUpperCase());
    await page.getByLabel("Contraseña", { exact: true }).fill(invitedPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    await page.goto("/admin/pagos");
    await expect(page).toHaveURL(/\/admin\/pagos/);
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL(/\/access-denied/);

    const profile = await service
      .from("profiles")
      .select("status,roles(code)")
      .eq("id", invitedUserId)
      .single();
    expect(profile.error).toBeNull();
    expect(profile.data?.status).toBe("active");
    expect(profile.data?.roles).toEqual({ code: "finance" });

    await page.goto(invitationUrl.toString());
    await page
      .getByRole("button", { name: "Aceptar invitación y continuar" })
      .click();
    await expect(
      page.getByRole("heading", { name: "La invitación expiró" }),
    ).toBeVisible();
  } finally {
    if (invitedUserId) await service.auth.admin.deleteUser(invitedUserId);
  }
});

test("invitation confirmation is responsive at required widths", async ({
  page,
}) => {
  const placeholderHash = "a".repeat(64);
  for (const width of [375, 390, 430, 768, 820, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 850 : 900 });
    await page.goto(
      `/aceptar-invitacion?token_hash=${placeholderHash}&type=invite`,
    );
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${width}px overflow`).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
    await expect(
      page.getByRole("button", { name: "Aceptar invitación y continuar" }),
    ).toHaveCSS("min-height", "48px");
  }
});
