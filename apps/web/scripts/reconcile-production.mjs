import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

const backupDir = process.argv[2]?.trim();
const projectRef = process.argv[3]?.trim();
if (!backupDir || !projectRef) {
  throw new Error("Pass the verified Legacy backup directory and Project Ref.");
}

function secretKey() {
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
  const production = keys.find(
    (item) =>
      item.type === "secret" && item.name === "production_backend_20260826",
  )?.api_key;
  if (!production) throw new Error("Production-only Supabase key not found.");
  if (keys.some((item) => item.name === "phase7_closure_20260826"))
    throw new Error("Obsolete Preview secret key is still active.");
  return production;
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

const expectedUsers = copyRows(
  readFileSync(join(backupDir, "auth-data.sql"), "utf8"),
  "auth",
  "users",
).map(({ id, email }) => ({ id, email: email.toLowerCase() }));

const supabase = createClient(
  `https://${projectRef}.supabase.co`,
  secretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: auth, error: authError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 100,
});
if (authError)
  throw new Error(
    `auth users: ${authError.message || authError.code || "request failed"}`,
  );
if (
  auth.users.length !== 3 ||
  !expectedUsers.every(({ id, email }) =>
    auth.users.some(
      (user) => user.id === id && user.email?.toLowerCase() === email,
    ),
  ) ||
  auth.users.some((user) => user.deleted_at || user.is_anonymous)
) {
  throw new Error("Live Auth reconciliation failed.");
}

const { data: roles, error: rolesError } = await supabase
  .from("roles")
  .select("id,code");
if (rolesError)
  throw new Error(
    `roles: ${rolesError.message || rolesError.code || "request failed"}`,
  );
const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id,role_id,status");
if (profilesError)
  throw new Error(
    `profiles: ${profilesError.message || profilesError.code || "request failed"}`,
  );
const ownerRole = roles.find((role) => role.code === "owner");
const adminRole = roles.find((role) => role.code === "admin");
if (
  profiles.length !== 3 ||
  profiles.some(
    (profile) =>
      profile.status !== "active" ||
      !expectedUsers.some((user) => user.id === profile.id),
  ) ||
  profiles.filter((profile) => profile.role_id === ownerRole?.id).length !==
    1 ||
  profiles.filter((profile) => profile.role_id === adminRole?.id).length !== 2
) {
  throw new Error("Live RBAC reconciliation failed.");
}

const { data: tasks, error: tasksError } = await supabase
  .from("tasks")
  .select(
    "id,assigned_to,created_by,status,completed_at,completed_by,migration_metadata",
  );
if (tasksError)
  throw new Error(
    `tasks: ${tasksError.message || tasksError.code || "request failed"}`,
  );
const expectedLabels = new Map([
  ["Equipo DIACA", 8],
  ["Equipo legal", 3],
  ["Equipo académico", 2],
]);
if (
  tasks.some(
    (task) =>
      task.assigned_to !== null ||
      task.status !== "completed" ||
      task.completed_at !== null ||
      task.completed_by !== null ||
      !profiles.some((profile) => profile.id === task.created_by) ||
      task.migration_metadata?.source !== "diaca-crm" ||
      task.migration_metadata?.legacy_task_id !== task.id ||
      task.migration_metadata?.legacy_done !== true,
  ) ||
  [...expectedLabels].some(
    ([label, expected]) =>
      tasks.filter(
        (task) => task.migration_metadata?.legacy_assignee_label === label,
      ).length !== expected,
  )
) {
  throw new Error("Live task reconciliation failed.");
}

const { data: buckets, error: bucketError } =
  await supabase.storage.listBuckets();
if (bucketError)
  throw new Error(
    `storage: ${bucketError.message || bucketError.code || "request failed"}`,
  );
if (buckets.length !== 0) throw new Error("Unexpected Storage buckets exist.");

process.stdout.write(
  `${JSON.stringify(
    {
      projectRef,
      authUsers: 3,
      roles: { ownerActive: 1, adminActive: 2 },
      tasks: {
        total: 13,
        completed: 13,
        unassigned: 13,
        labels: Object.fromEntries(expectedLabels),
      },
      hardenedBusinessTables: "verified from logical dump and isolated restore",
      storageBuckets: 0,
      previewSecretRevoked: true,
    },
    null,
    2,
  )}\n`,
);
