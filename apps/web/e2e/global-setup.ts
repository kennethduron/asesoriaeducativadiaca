import { createClient } from "@supabase/supabase-js";

const password = "Local-E2E-Only!2026";

export default async function globalSetup() {
  const url = process.env.E2E_SUPABASE_URL;
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error("Supabase local is required for financial E2E tests.");

  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const fixtures = [
    ["finance", "Finanzas E2E"],
    ["owner", "Owner E2E"],
    ["staff", "Staff E2E"],
  ] as const;

  const runId = `${Date.now()}-${process.pid}`;
  for (const [roleCode, fullName] of fixtures) {
    const email = `${roleCode}.e2e.${runId}@example.invalid`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user)
      throw error ?? new Error(`Could not create ${email}`);
    const user = data.user;

    const { data: role, error: roleError } = await service
      .from("roles")
      .select("id")
      .eq("code", roleCode)
      .single();
    if (roleError) throw roleError;
    const { error: profileError } = await service
      .from("profiles")
      .update({ role_id: role.id, status: "active" })
      .eq("id", user.id);
    if (profileError) throw profileError;
    process.env[`E2E_${roleCode.toUpperCase()}_EMAIL`] = email;
  }

  process.env.E2E_PASSWORD = password;
}
