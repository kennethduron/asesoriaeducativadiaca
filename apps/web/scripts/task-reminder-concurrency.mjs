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
const output = execFileSync(command[0], command[1], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
const env = Object.fromEntries(
  output
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="(.*)"$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
assert(
  env.API_URL && env.ANON_KEY && env.SERVICE_ROLE_KEY,
  "Supabase local is unavailable",
);

const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const user = createClient(env.API_URL, env.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `phase7.concurrent.${randomUUID()}@example.invalid`;
const password = `LocalOnly!${randomUUID()}Aa1`;
const { data: created, error: createError } =
  await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Owner F7 Concurrente" },
  });
assert.ifError(createError);
assert(created.user);

try {
  const { data: role, error: roleError } = await service
    .from("roles")
    .select("id")
    .eq("code", "owner")
    .single();
  assert.ifError(roleError);
  assert.ifError(
    (
      await service
        .from("profiles")
        .update({ role_id: role.id, status: "active" })
        .eq("id", created.user.id)
    ).error,
  );
  assert.ifError(
    (await user.auth.signInWithPassword({ email, password })).error,
  );

  const dueAt = new Date(Date.now() - 60_000).toISOString();
  const { data: taskId, error: taskError } = await user.rpc("create_task", {
    task_title: "Cron concurrente F7",
    task_description: null,
    task_client_id: null,
    task_client_service_id: null,
    task_assigned_to: created.user.id,
    task_priority: "high",
    task_due_at: dueAt,
    reminder_specs: [{ relative_minutes: 0, push: false, email: true }],
  });
  assert.ifError(taskError);
  assert(taskId);

  const claims = await Promise.all([
    service.rpc("claim_due_task_reminders", {
      batch_size: 50,
      operation_correlation_id: randomUUID(),
    }),
    service.rpc("claim_due_task_reminders", {
      batch_size: 50,
      operation_correlation_id: randomUUID(),
    }),
  ]);
  claims.forEach(({ error }) => assert.ifError(error));
  assert.equal(
    claims.reduce((sum, item) => sum + (item.data?.length ?? 0), 0),
    1,
    "exactly one concurrent claimant wins",
  );
  const item = claims.flatMap(({ data }) => data ?? [])[0];
  assert(item?.email_delivery_id);

  assert.ifError(
    (
      await user.rpc("set_task_status", {
        target_task_id: taskId,
        new_status: "completed",
      })
    ).error,
  );
  const { data: dispatchable, error: recheckError } = await service.rpc(
    "task_reminder_still_dispatchable",
    { target_reminder_id: item.reminder_id },
  );
  assert.ifError(recheckError);
  assert.equal(dispatchable, false, "completion after claim prevents send");
  assert.ifError(
    (
      await service.rpc("record_task_delivery", {
        target_delivery_id: item.email_delivery_id,
        delivery_status: "cancelled",
      })
    ).error,
  );
  const replay = await service.rpc("claim_due_task_reminders", {
    batch_size: 50,
    operation_correlation_id: randomUUID(),
  });
  assert.ifError(replay.error);
  assert.equal(
    replay.data?.length ?? 0,
    0,
    "completed reminder is not replayed",
  );

  console.log(
    JSON.stringify({
      concurrentClaims: "1 winner",
      completeBeforeSend: "blocked",
      replay: "0 deliveries",
    }),
  );
} finally {
  await service.from("tasks").delete().eq("created_by", created.user.id);
  await service.auth.admin.deleteUser(created.user.id);
}
