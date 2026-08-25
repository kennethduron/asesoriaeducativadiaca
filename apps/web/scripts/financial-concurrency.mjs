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
const email = `phase4.concurrent.${randomUUID()}@example.invalid`;
const password = `LocalOnly!${randomUUID()}Aa1`;
const { data: created, error: createError } =
  await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Owner Concurrente Sintético" },
  });
assert.ifError(createError);
assert(created.user, "Concurrency user was not created");

const { data: ownerRole, error: roleError } = await service
  .from("roles")
  .select("id")
  .eq("code", "owner")
  .single();
assert.ifError(roleError);
const { error: profileError } = await service
  .from("profiles")
  .update({ role_id: ownerRole.id, status: "active" })
  .eq("id", created.user.id);
assert.ifError(profileError);

const userClient = createClient(apiUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: signInError } = await userClient.auth.signInWithPassword({
  email,
  password,
});
assert.ifError(signInError);

const { data: clientRows, error: clientError } = await userClient
  .from("clients")
  .select("id")
  .eq("status", "active")
  .limit(1);
assert.ifError(clientError);
const clientId = clientRows?.[0]?.id;
assert(clientId, "Synthetic client was not found");
const { data: method, error: methodError } = await userClient
  .from("payment_methods")
  .select("id")
  .eq("code", "cash")
  .single();
assert.ifError(methodError);

async function createCharge(amount, concept) {
  const { data, error } = await userClient
    .from("charges")
    .insert({
      client_id: clientId,
      concept,
      amount,
      currency_code: "HNL",
      created_by: created.user.id,
      updated_by: created.user.id,
    })
    .select("id")
    .single();
  assert.ifError(error);
  return data.id;
}

async function createPayment(amount) {
  const idempotencyKey = randomUUID();
  const { data, error } = await userClient
    .from("payments")
    .insert({
      client_id: clientId,
      amount,
      currency_code: "HNL",
      payment_method_id: method.id,
      idempotency_key: idempotencyKey,
      created_by: created.user.id,
    })
    .select("id")
    .single();
  assert.ifError(error);
  return { id: data.id, key: idempotencyKey };
}

async function confirm(payment, allocations) {
  const { data, error } = await userClient.rpc("confirm_payment", {
    target_payment_id: payment.id,
    allocations_payload: allocations,
    operation_key: payment.key,
  });
  if (error) throw new Error(error.message);
  return data[0];
}

async function balance(chargeId) {
  const { data, error } = await userClient
    .from("charge_balances")
    .select("remaining_amount,derived_status")
    .eq("charge_id", chargeId)
    .single();
  assert.ifError(error);
  return data;
}

// A: two independent payments race for one charge.
const racedCharge = await createCharge(1000, "Concurrencia: mismo cargo");
const racedPaymentA = await createPayment(700);
const racedPaymentB = await createPayment(700);
const racedResults = await Promise.allSettled([
  confirm(racedPaymentA, [{ charge_id: racedCharge, amount: "700.00" }]),
  confirm(racedPaymentB, [{ charge_id: racedCharge, amount: "700.00" }]),
]);
assert.equal(
  racedResults.filter((result) => result.status === "fulfilled").length,
  1,
  "Only one competing payment may be applied",
);
assert.equal(Number((await balance(racedCharge)).remaining_amount), 300);

// B/C: the same confirmation is idempotent; a changed payload is rejected.
const idempotentCharge = await createCharge(500, "Concurrencia: idempotencia");
const idempotentPayment = await createPayment(500);
const idempotentPayload = [{ charge_id: idempotentCharge, amount: "500.00" }];
const [firstRepeat, secondRepeat] = await Promise.all([
  confirm(idempotentPayment, idempotentPayload),
  confirm(idempotentPayment, idempotentPayload),
]);
assert.equal(firstRepeat.receipt_id, secondRepeat.receipt_id);
await assert.rejects(
  confirm(idempotentPayment, [
    { charge_id: idempotentCharge, amount: "499.00" },
  ]),
  /different request/i,
);

// D: concurrent confirmations receive distinct sequence numbers.
const receiptChargeA = await createCharge(100, "Concurrencia: recibo A");
const receiptChargeB = await createCharge(100, "Concurrencia: recibo B");
const receiptPaymentA = await createPayment(100);
const receiptPaymentB = await createPayment(100);
const receiptResults = await Promise.all([
  confirm(receiptPaymentA, [{ charge_id: receiptChargeA, amount: "100.00" }]),
  confirm(receiptPaymentB, [{ charge_id: receiptChargeB, amount: "100.00" }]),
]);
assert.notEqual(
  receiptResults[0].receipt_number,
  receiptResults[1].receipt_number,
);

// E: two void attempts serialize; exactly one changes the ledger.
const voidResults = await Promise.allSettled([
  userClient.rpc("void_payment", {
    target_payment_id: receiptPaymentA.id,
    reason: "Prueba concurrente de anulación",
  }),
  userClient.rpc("void_payment", {
    target_payment_id: receiptPaymentA.id,
    reason: "Prueba concurrente de anulación",
  }),
]);
const normalizedVoidResults = voidResults.map((result) => {
  if (result.status === "rejected") return { ok: false };
  return { ok: !result.value.error };
});
assert.equal(normalizedVoidResults.filter((result) => result.ok).length, 1);
assert.equal(Number((await balance(receiptChargeA)).remaining_amount), 100);
const { data: voidedPayment, error: voidedError } = await userClient
  .from("payments")
  .select("status,receipts(status),payment_allocations(reversed_at)")
  .eq("id", receiptPaymentA.id)
  .single();
assert.ifError(voidedError);
assert.equal(voidedPayment.status, "voided");
const voidedReceipt = Array.isArray(voidedPayment.receipts)
  ? voidedPayment.receipts[0]
  : voidedPayment.receipts;
assert.equal(voidedReceipt?.status, "voided");
assert(voidedPayment.payment_allocations.every((item) => item.reversed_at));

console.log(
  JSON.stringify({
    competingPayments: "1 applied, 1 rejected",
    idempotentDoubleSubmit: "same receipt",
    changedPayload: "rejected",
    concurrentReceipts: receiptResults.map((item) => item.receipt_number),
    concurrentVoid: "1 applied, 1 rejected",
  }),
);
