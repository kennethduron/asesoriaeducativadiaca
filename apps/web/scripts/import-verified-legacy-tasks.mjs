import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

const backupDir =
  process.env.DIACA_LEGACY_BACKUP_DIR?.trim() || process.argv[2]?.trim();
const projectRef =
  process.env.DIACA_PRODUCTION_PROJECT_REF?.trim() || process.argv[3]?.trim();
const ownerUsername = (
  process.env.DIACA_INITIAL_OWNER_USERNAME?.trim() || "kenneth"
).toLowerCase();

if (!backupDir || !projectRef) {
  throw new Error(
    "Pass the verified Legacy backup directory and target Project Ref.",
  );
}

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
  if (result.status !== 0) throw new Error("Could not resolve Supabase keys.");
  const keys = JSON.parse(result.stdout);
  const secret = keys.find((item) => item.type === "secret")?.api_key;
  if (!secret?.startsWith("sb_secret_"))
    throw new Error("No target secret key is available.");
  return secret;
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

const publicSql = readFileSync(join(backupDir, "public-data.sql"), "utf8");
const authSql = readFileSync(join(backupDir, "auth-data.sql"), "utf8");
const legacyTasks = copyRows(publicSql, "public", "tasks");
const legacyAdmins = copyRows(publicSql, "public", "crm_admins");
const legacyUsers = copyRows(authSql, "auth", "users");

const ownerAdmin = legacyAdmins.find(
  (admin) => admin.username?.toLowerCase() === ownerUsername,
);
const owner = legacyUsers.find(
  (user) => user.email?.toLowerCase() === ownerAdmin?.email?.toLowerCase(),
);
if (!owner) throw new Error("Approved Legacy Owner could not be resolved.");

const expectedLabels = new Map([
  ["Equipo DIACA", 8],
  ["Equipo legal", 3],
  ["Equipo académico", 2],
]);
if (legacyTasks.length !== 13)
  throw new Error("Expected exactly 13 Legacy tasks.");
for (const [label, expected] of expectedLabels) {
  if (legacyTasks.filter((task) => task.owner === label).length !== expected)
    throw new Error("Legacy task label distribution changed.");
}
if (
  legacyTasks.some(
    (task) =>
      !expectedLabels.has(task.owner) ||
      task.done !== "t" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(task.due) ||
      !task.created_at,
  )
) {
  throw new Error("Legacy task validation changed.");
}

const supabase = createClient(
  `https://${projectRef}.supabase.co`,
  resolveSecretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: existing, error: existingError } = await supabase
  .from("tasks")
  .select("id", { count: "exact" });
if (existingError) throw existingError;
if (existing.length !== 0) throw new Error("Target tasks table is not empty.");

for (const task of legacyTasks) {
  const { error } = await supabase.rpc("import_verified_legacy_task", {
    legacy_task_id: task.id,
    legacy_title: task.title,
    legacy_assignee_label: task.owner,
    legacy_due_raw: task.due,
    legacy_done: true,
    legacy_created_at: task.created_at,
    migration_actor: owner.id,
  });
  if (error) throw error;
}

const { data: migrated, error: verifyError } = await supabase
  .from("tasks")
  .select(
    "id,assigned_to,created_by,priority,status,due_at,created_at,migration_metadata",
  );
if (verifyError) throw verifyError;
if (
  migrated.length !== 13 ||
  migrated.some(
    (task) =>
      task.assigned_to !== null ||
      task.created_by !== owner.id ||
      task.priority !== "normal" ||
      task.status !== "completed" ||
      task.migration_metadata?.source !== "diaca-crm" ||
      task.migration_metadata?.legacy_task_id !== task.id ||
      task.migration_metadata?.legacy_done !== true,
  )
) {
  throw new Error("Legacy task reconciliation failed.");
}
for (const [label, expected] of expectedLabels) {
  if (
    migrated.filter(
      (task) => task.migration_metadata?.legacy_assignee_label === label,
    ).length !== expected
  ) {
    throw new Error("Migrated task label distribution changed.");
  }
}

process.stdout.write(
  "Imported and reconciled 13 Legacy tasks: 13 completed, 13 unassigned, labels 8/3/2.\n",
);
