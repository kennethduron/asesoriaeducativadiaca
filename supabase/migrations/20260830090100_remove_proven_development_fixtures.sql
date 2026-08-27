-- One-time F8 conversion cleanup. This migration is intentionally allowlisted:
-- a fresh database is a no-op, while the known DEV state must match exactly or
-- the whole transaction aborts before deleting anything.

do $$
declare
  synthetic_user_ids uuid[];
  synthetic_user_count integer;
  business_row_count integer;
  audit_row_count integer;
  rate_limit_row_count integer;
begin
  select coalesce(array_agg(id order by id), '{}'::uuid[]), count(*)
  into synthetic_user_ids, synthetic_user_count
  from auth.users
  where lower(email) = any (array[
    'owner.test@example.com',
    'admin.test@example.com',
    'finance.test@example.com',
    'staff.test@example.com',
    'inactive.test@example.com',
    'seed.staff@diaca.example.invalid'
  ]);

  if synthetic_user_count not in (0, 6) then
    raise exception 'F8 cleanup aborted: expected 0 or 6 allowlisted DEV users, found %', synthetic_user_count;
  end if;

  if exists (
    select 1 from auth.users
    where not (lower(email) = any (array[
      'owner.test@example.com',
      'admin.test@example.com',
      'finance.test@example.com',
      'staff.test@example.com',
      'inactive.test@example.com',
      'seed.staff@diaca.example.invalid'
    ]))
  ) then
    raise exception 'F8 cleanup aborted: non-DEV Auth users already exist';
  end if;

  -- Fresh/local databases have no Auth fixtures until seed.sql runs after all
  -- migrations. Leave their versioned reference audit intact.
  if synthetic_user_count = 0 then
    return;
  end if;

  select
    (select count(*) from public.clients) +
    (select count(*) from public.client_notes) +
    (select count(*) from public.client_services) +
    (select count(*) from public.charges) +
    (select count(*) from public.payments) +
    (select count(*) from public.payment_allocations) +
    (select count(*) from public.receipts) +
    (select count(*) from public.tasks) +
    (select count(*) from public.task_reminders) +
    (select count(*) from public.task_reminder_deliveries) +
    (select count(*) from public.task_push_tokens)
  into business_row_count;

  if business_row_count <> 17 then
    raise exception 'F8 cleanup aborted: expected 17 DEV business rows, found %', business_row_count;
  end if;

  if (
    (select count(*) from public.clients
      where id::text like '31000000-0000-0000-0000-%'
        and email like '%.invalid') <> 10
    or (select count(*) from public.client_notes
      where id::text like '32000000-0000-0000-0000-%') <> 3
    or (select count(*) from public.client_services
      where id::text like '33000000-0000-0000-0000-%') <> 4
    or (select count(*) from public.charges) <> 0
    or (select count(*) from public.payments) <> 0
    or (select count(*) from public.payment_allocations) <> 0
    or (select count(*) from public.receipts) <> 0
    or (select count(*) from public.tasks) <> 0
    or (select count(*) from public.task_reminders) <> 0
    or (select count(*) from public.task_reminder_deliveries) <> 0
    or (select count(*) from public.task_push_tokens) <> 0
  ) then
    raise exception 'F8 cleanup aborted: DEV business allowlist does not match';
  end if;

  select count(*) into audit_row_count from public.audit_logs;
  if audit_row_count <> 227 then
    raise exception 'F8 cleanup aborted: expected 227 DEV audit rows, found %', audit_row_count;
  end if;
  if exists (
    select 1
    from public.audit_logs
    where actor_id is not null and not (actor_id = any (synthetic_user_ids))
  ) then
    raise exception 'F8 cleanup aborted: audit contains a non-DEV actor';
  end if;
  if exists (
    select 1
    from public.audit_logs
    where action not in (
      'auth.login.success', 'auth.logout', 'client_service.created',
      'client.created', 'client.note.created', 'profile.updated',
      'report.exported', 'role.permission_changed',
      'service_category.created', 'service.created', 'task.cancelled',
      'task.completed', 'task.created', 'task.reopened', 'task.updated',
      'user.role_changed'
    )
  ) then
    raise exception 'F8 cleanup aborted: audit contains an unexpected action';
  end if;

  select count(*) into rate_limit_row_count from public.rate_limit_buckets;
  if rate_limit_row_count <> 2 then
    raise exception 'F8 cleanup aborted: expected 2 ephemeral rate-limit rows, found %', rate_limit_row_count;
  end if;
  if exists (
    select 1 from public.rate_limit_buckets
    where scope not in ('admin.report_export', 'auth.password_reset')
  ) then
    raise exception 'F8 cleanup aborted: unexpected rate-limit scope';
  end if;

  if (
    (select count(*) from public.profiles where id = any (synthetic_user_ids)) <> 6
    or (select count(*) from auth.identities where user_id = any (synthetic_user_ids)) <> 5
    or (select count(*) from auth.sessions) <> 0
    or (select count(*) from auth.refresh_tokens) <> 0
    or (select count(*) from auth.flow_state) <> 1
  ) then
    raise exception 'F8 cleanup aborted: DEV Auth dependency counts changed';
  end if;

  -- Delete only the proven synthetic dependency graph.
  delete from public.audit_logs;
  delete from public.rate_limit_buckets;
  delete from public.client_services
    where id::text like '33000000-0000-0000-0000-%';
  delete from public.client_notes
    where id::text like '32000000-0000-0000-0000-%';
  delete from public.clients
    where id::text like '31000000-0000-0000-0000-%'
      and email like '%.invalid';

  delete from auth.flow_state;
  delete from auth.users where id = any (synthetic_user_ids);

  if exists (select 1 from public.profiles)
    or exists (select 1 from public.clients)
    or exists (select 1 from public.client_notes)
    or exists (select 1 from public.client_services)
    or exists (select 1 from public.audit_logs)
    or exists (select 1 from public.rate_limit_buckets)
    or exists (select 1 from auth.users)
  then
    raise exception 'F8 cleanup reconciliation failed';
  end if;
end;
$$;
