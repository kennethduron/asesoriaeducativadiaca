import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_DEV_SECRET_KEY;
const password = process.env.DIACA_TEST_PASSWORD;

if (!url || !secretKey || !password) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_DEV_SECRET_KEY and DIACA_TEST_PASSWORD.",
  );
}

if (password.length < 12) {
  throw new Error("DIACA_TEST_PASSWORD must contain at least 12 characters.");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const fixtures = [
  ["owner", "owner.test@example.com", "Owner Test"],
  ["admin", "admin.test@example.com", "Admin Test"],
  ["finance", "finance.test@example.com", "Finance Test"],
  ["staff", "staff.test@example.com", "Staff Test"],
  ["staff", "inactive.test@example.com", "Inactive Test"],
];

for (const [roleCode, email, fullName] of fixtures) {
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw createError;
  }

  let userId = created.user?.id;
  if (!userId) {
    const { data: users, error: listError } =
      await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (listError) throw listError;
    userId = users.users.find((user) => user.email === email)?.id;
  }
  if (!userId) throw new Error(`Could not resolve synthetic user ${email}.`);

  if (roleCode === "owner") {
    const { error } = await supabase.rpc("bootstrap_initial_owner", {
      target_user_id: userId,
    });
    if (error && !error.message.includes("already exists")) throw error;
    continue;
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("code", roleCode)
    .single();
  if (roleError) throw roleError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role_id: role.id,
      status: email.startsWith("inactive.") ? "inactive" : "active",
    })
    .eq("id", userId);
  if (profileError) throw profileError;
}

process.stdout.write("Synthetic development users are provisioned.\n");
