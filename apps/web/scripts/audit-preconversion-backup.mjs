import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const backupDir =
  process.env.DIACA_DEV_BACKUP_DIR?.trim() || process.argv[2]?.trim();

if (!backupDir) {
  throw new Error(
    "Set DIACA_DEV_BACKUP_DIR to the verified DEV backup directory.",
  );
}

const knownSyntheticEmails = new Set([
  "admin.test@example.com",
  "finance.test@example.com",
  "inactive.test@example.com",
  "owner.test@example.com",
  "seed.staff@diaca.example.invalid",
  "staff.test@example.com",
]);

const knownSyntheticIds = new Set([
  "30000000-0000-0000-0000-000000000001",
  ...Array.from(
    { length: 10 },
    (_, index) =>
      `31000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
  ),
  ...Array.from(
    { length: 3 },
    (_, index) =>
      `32000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
  ),
  ...Array.from(
    { length: 4 },
    (_, index) =>
      `33000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
  ),
  ...Array.from(
    { length: 2 },
    (_, index) =>
      `34000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
  ),
  "35000000-0000-0000-0000-000000000001",
  "35000000-0000-0000-0000-000000000101",
]);

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

function copyBlocks(sql) {
  const blocks = new Map();
  const pattern =
    /COPY "([^"]+)"\."([^"]+)" \(([^)]+)\) FROM stdin;\r?\n([\s\S]*?)\r?\n\\\./g;
  for (const match of sql.matchAll(pattern)) {
    const [, schema, table, columnSql, body] = match;
    const columns = [...columnSql.matchAll(/"([^"]+)"/g)].map(
      (item) => item[1],
    );
    const rows = body
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const values = line.split("\t").map(decodeCopyValue);
        return Object.fromEntries(
          columns.map((column, index) => [column, values[index]]),
        );
      });
    blocks.set(`${schema}.${table}`, rows);
  }
  return blocks;
}

function isSyntheticEmail(email) {
  const normalized = email?.toLowerCase();
  return (
    knownSyntheticEmails.has(normalized) || normalized?.endsWith(".invalid")
  );
}

const files = readdirSync(backupDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();
if (files.length === 0) throw new Error("No SQL dump files found.");

const manifest = files.map((name) => {
  const path = join(backupDir, name);
  const bytes = statSync(path).size;
  const sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
  return { name, bytes, sha256 };
});

const blocks = new Map();
for (const name of files.filter(
  (item) => item.endsWith("-data.sql") && item !== "migrations-data.sql",
)) {
  const parsed = copyBlocks(readFileSync(join(backupDir, name), "utf8"));
  for (const [key, rows] of parsed) blocks.set(key, rows);
}
if (files.includes("migrations-data.sql")) {
  const migrations = copyBlocks(
    readFileSync(join(backupDir, "migrations-data.sql"), "utf8"),
  );
  for (const [key, rows] of migrations) {
    if (key.startsWith("supabase_migrations.")) blocks.set(key, rows);
  }
}

const authUsers = blocks.get("auth.users") ?? [];
const syntheticUserIds = new Set(
  authUsers
    .filter((user) => isSyntheticEmail(user.email))
    .map((user) => user.id),
);

const referenceTables = new Set([
  "public.payment_methods",
  "public.permissions",
  "public.role_permissions",
  "public.roles",
  "public.service_catalog",
  "public.service_categories",
]);

function rowIsProvenSynthetic(table, row) {
  if (table === "auth.users") return isSyntheticEmail(row.email);
  if (table === "auth.identities")
    return syntheticUserIds.has(row.user_id) || isSyntheticEmail(row.email);
  if (table === "public.profiles") return syntheticUserIds.has(row.id);
  if (row.id && knownSyntheticIds.has(row.id)) return true;
  return [row.actor_id, row.created_by, row.updated_by, row.user_id].some(
    (value) => value && syntheticUserIds.has(value),
  );
}

const inventory = [...blocks.entries()]
  .map(([table, rows]) => {
    const reference = referenceTables.has(table);
    const provenSynthetic = reference
      ? 0
      : rows.filter((row) => rowIsProvenSynthetic(table, row)).length;
    return {
      table,
      rows: rows.length,
      classification: reference
        ? "versioned-reference"
        : provenSynthetic === rows.length && rows.length > 0
          ? "proven-synthetic"
          : provenSynthetic > 0
            ? "mixed-review-required"
            : rows.length === 0
              ? "empty"
              : "preserve-or-review",
      provenSynthetic,
      preserveOrReview: reference ? 0 : rows.length - provenSynthetic,
    };
  })
  .sort((a, b) => a.table.localeCompare(b.table));

process.stdout.write(
  `${JSON.stringify(
    {
      backupFiles: manifest,
      auth: {
        totalUsers: authUsers.length,
        provenSyntheticUsers: syntheticUserIds.size,
        preserveOrReviewUsers: authUsers.length - syntheticUserIds.size,
      },
      inventory,
    },
    null,
    2,
  )}\n`,
);
