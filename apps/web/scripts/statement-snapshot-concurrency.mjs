import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const command =
  process.platform === "win32"
    ? [
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", "pnpm.cmd exec supabase status -o env"],
      ]
    : ["pnpm", ["exec", "supabase", "status", "-o", "env"]];
const statusOutput = execFileSync(command[0], command[1], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
const localEnvironment = Object.fromEntries(
  statusOutput
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="(.*)"$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
const apiUrl = localEnvironment.API_URL;
const anonKey = localEnvironment.ANON_KEY;
const serviceRoleKey = localEnvironment.SERVICE_ROLE_KEY;
assert(apiUrl && anonKey && serviceRoleKey, "Supabase local is not available");

const service = createClient(apiUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `phase5.snapshot.${randomUUID()}@example.invalid`;
const password = `LocalOnly!${randomUUID()}Aa1`;
const { data: created, error: createError } =
  await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Owner Snapshot Sintético" },
  });
assert.ifError(createError);
assert(created.user, "Snapshot user was not created");
const { data: ownerRole, error: roleError } = await service
  .from("roles")
  .select("id")
  .eq("code", "owner")
  .single();
assert.ifError(roleError);
assert.ifError(
  (
    await service
      .from("profiles")
      .update({ role_id: ownerRole.id, status: "active" })
      .eq("id", created.user.id)
  ).error,
);

const user = createClient(apiUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
assert.ifError((await user.auth.signInWithPassword({ email, password })).error);
const { data: client, error: clientError } = await user
  .from("clients")
  .insert({
    full_name: "Cliente Snapshot Sintético",
    client_type: "individual",
    status: "active",
    created_by: created.user.id,
    updated_by: created.user.id,
  })
  .select("id")
  .single();
assert.ifError(clientError);
const { data: charge, error: chargeError } = await user
  .from("charges")
  .insert({
    client_id: client.id,
    concept: "Cargo de consistencia F5",
    amount: 100,
    currency_code: "HNL",
    created_by: created.user.id,
    updated_by: created.user.id,
  })
  .select("id")
  .single();
assert.ifError(chargeError);
const { data: method, error: methodError } = await user
  .from("payment_methods")
  .select("id")
  .eq("code", "cash")
  .single();
assert.ifError(methodError);
const idempotencyKey = randomUUID();
const { data: payment, error: paymentError } = await user
  .from("payments")
  .insert({
    client_id: client.id,
    amount: 100,
    currency_code: "HNL",
    payment_method_id: method.id,
    idempotency_key: idempotencyKey,
    created_by: created.user.id,
  })
  .select("id")
  .single();
assert.ifError(paymentError);

const statement = () =>
  user.rpc("get_client_statement", {
    target_client_id: client.id,
    currency_filter: "HNL",
    from_date: "2000-01-01",
    to_date: "2100-01-01",
  });
const assertConsistent = (snapshot) => {
  assert.ifError(snapshot.error);
  const summary = snapshot.data.summary;
  assert.equal(
    Number(summary.closing_balance),
    Number(summary.outstanding_balance),
    "statement summary and movements must share one MVCC snapshot",
  );
  assert([0, 100].includes(Number(summary.closing_balance)));
};

const before = await statement();
assertConsistent(before);
assert.equal(Number(before.data.summary.closing_balance), 100);
const concurrentReads = Array.from({ length: 30 }, () => statement());
const confirmation = user.rpc("confirm_payment", {
  target_payment_id: payment.id,
  allocations_payload: [{ charge_id: charge.id, amount: "100.00" }],
  operation_key: idempotencyKey,
});
const [snapshots, confirmed] = await Promise.all([
  Promise.all(concurrentReads),
  confirmation,
]);
assert.ifError(confirmed.error);
snapshots.forEach(assertConsistent);
const after = await statement();
assertConsistent(after);
assert.equal(Number(after.data.summary.closing_balance), 0);

console.log(
  JSON.stringify({
    snapshotsChecked: snapshots.length + 2,
    observedStates: [
      ...new Set(
        [before, ...snapshots, after].map((item) =>
          Number(item.data.summary.closing_balance),
        ),
      ),
    ].sort(),
    reconciliation: "consistent",
  }),
);
