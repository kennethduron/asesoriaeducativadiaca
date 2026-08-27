import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

const backupDir =
  process.env.DIACA_LEGACY_BACKUP_DIR?.trim() || process.argv[2]?.trim();
const projectRef =
  process.env.DIACA_PRODUCTION_PROJECT_REF?.trim() || process.argv[3]?.trim();
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  (projectRef ? `https://${projectRef}.supabase.co` : undefined);
const ownerUsername = (
  process.env.DIACA_INITIAL_OWNER_USERNAME?.trim() || "kenneth"
).toLowerCase();

function resolveSecretKey() {
  const configured = process.env.SUPABASE_SECRET_KEY?.trim();
  if (configured) return configured;
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    executable,
    [
      "supabase",
      "projects",
      "api-keys",
      "--project-ref",
      projectRef,
      "--reveal",
      "--output",
      "json",
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    throw new Error("Could not resolve the target Supabase secret key.");
  }
  const keys = JSON.parse(result.stdout);
  const secret = keys.find((item) => item.type === "secret")?.api_key;
  if (!secret?.startsWith("sb_secret_")) {
    throw new Error(
      "No Supabase secret key is available for the target project.",
    );
  }
  return secret;
}

if (!url || !backupDir || !projectRef) {
  throw new Error(
    "Pass the verified Legacy backup directory and target Project Ref, or set their DIACA_* environment variables.",
  );
}

const secretKey = resolveSecretKey();

const parsedUrl = new URL(url);
if (parsedUrl.hostname !== `${projectRef}.supabase.co`) {
  throw new Error(
    "The configured Production project ref does not match the URL.",
  );
}

function decodeCopyValue(value) {
  if (value === "\\N") return null;
  return value.replace(
    /\\([btnrfv\\]|[0-7]{1,3}|x[0-9a-fA-F]{2})/g,
    (_, code) => {
      const named = {
        b: "\b",
        t: "\t",
        n: "\n",
        r: "\r",
        f: "\f",
        v: "\v",
        "\\": "\\",
      };
      if (code in named) return named[code];
      if (code.startsWith("x"))
        return String.fromCharCode(Number.parseInt(code.slice(1), 16));
      return String.fromCharCode(Number.parseInt(code, 8));
    },
  );
}

function copyRows(sql, schema, table) {
  const pattern = new RegExp(
    `COPY "${schema}"\\."${table}" \\(([^)]+)\\) FROM stdin;\\r?\\n([\\s\\S]*?)\\r?\\n\\\\\\.`,
  );
  const match = sql.match(pattern);
  if (!match) throw new Error(`COPY block not found: ${schema}.${table}`);
  const columns = [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
  return match[2]
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const values = line.split("\t").map(decodeCopyValue);
      return Object.fromEntries(
        columns.map((column, index) => [column, values[index]]),
      );
    });
}

const authSql = readFileSync(join(backupDir, "auth-data.sql"), "utf8");
const publicSql = readFileSync(join(backupDir, "public-data.sql"), "utf8");
const legacyUsers = copyRows(authSql, "auth", "users");
const legacyAdmins = copyRows(publicSql, "public", "crm_admins");

if (legacyUsers.length !== 3 || legacyAdmins.length !== 3) {
  throw new Error("Expected exactly three verified Legacy users and admins.");
}
if (
  !legacyUsers.every((user) => String(user.encrypted_password).startsWith("$2"))
) {
  throw new Error(
    "A Legacy password hash is not supported bcrypt; use controlled reset instead.",
  );
}
const ownerAdmin = legacyAdmins.find(
  (admin) => admin.username?.toLowerCase() === ownerUsername,
);
if (!ownerAdmin) throw new Error("The approved initial Owner was not found.");
const ownerEmail = ownerAdmin.email.toLowerCase();
if (!legacyUsers.some((user) => user.email?.toLowerCase() === ownerEmail))
  throw new Error("The initial Owner is not one of the verified Legacy users.");

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: existing, error: listError } =
  await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
if (listError) throw listError;

for (const user of legacyUsers) {
  const email = user.email.toLowerCase();
  const admin = legacyAdmins.find((item) => item.email.toLowerCase() === email);
  if (!admin) throw new Error("Legacy Auth/admin correspondence changed.");
  const found = existing.users.find(
    (item) => item.id === user.id || item.email?.toLowerCase() === email,
  );
  if (found) {
    if (found.id !== user.id || found.email?.toLowerCase() !== email)
      throw new Error("Production contains a conflicting Auth identity.");
    continue;
  }

  const { error } = await supabase.auth.admin.createUser({
    id: user.id,
    email,
    password_hash: user.encrypted_password,
    email_confirm: Boolean(user.email_confirmed_at),
    user_metadata: { full_name: admin.username },
  });
  if (error) throw error;
}

const owner = legacyUsers.find(
  (user) => user.email.toLowerCase() === ownerEmail,
);
const { error: ownerError } = await supabase.rpc("bootstrap_initial_owner", {
  target_user_id: owner.id,
});
if (ownerError && !ownerError.message.includes("already exists"))
  throw ownerError;

const { data: roleRows, error: roleError } = await supabase
  .from("roles")
  .select("id,code")
  .in("code", ["owner", "admin"]);
if (roleError) throw roleError;
const adminRole = roleRows.find((role) => role.code === "admin");
const ownerRole = roleRows.find((role) => role.code === "owner");
if (!adminRole || !ownerRole)
  throw new Error("Production RBAC roles are incomplete.");

const otherIds = legacyUsers
  .filter((user) => user.id !== owner.id)
  .map((user) => user.id);
const { error: profileError } = await supabase
  .from("profiles")
  .update({ role_id: adminRole.id, status: "active" })
  .in("id", otherIds);
if (profileError) throw profileError;

const { data: finalProfiles, error: verifyError } = await supabase
  .from("profiles")
  .select("id,role_id,status")
  .in(
    "id",
    legacyUsers.map((user) => user.id),
  );
if (verifyError) throw verifyError;
if (
  finalProfiles.length !== 3 ||
  !finalProfiles.some(
    (profile) =>
      profile.id === owner.id &&
      profile.role_id === ownerRole.id &&
      profile.status === "active",
  ) ||
  !otherIds.every((id) =>
    finalProfiles.some(
      (profile) =>
        profile.id === id &&
        profile.role_id === adminRole.id &&
        profile.status === "active",
    ),
  )
) {
  throw new Error("Production user/profile reconciliation failed.");
}

process.stdout.write(
  "Provisioned 3 verified Legacy identities: 1 owner and 2 admins.\n",
);
