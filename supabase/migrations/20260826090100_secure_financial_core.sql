create or replace function public.guard_charge_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  linked_client uuid;
begin
  if new.client_service_id is not null then
    select cs.client_id into linked_client
    from public.client_services cs
    where cs.id = new.client_service_id;
    if linked_client is null or linked_client <> new.client_id then
      raise exception 'Client service must belong to the same client';
    end if;
  end if;

  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if actor is null then raise exception 'Authentication required'; end if;

  if tg_op = 'INSERT' then
    new.created_by := actor;
    new.updated_by := actor;
    new.status := 'pending';
    new.cancelled_at := null;
    new.cancelled_by := null;
    new.cancellation_reason := null;
    return new;
  end if;

  if old.status = 'cancelled' then
    raise exception 'Cancelled charges cannot be changed';
  end if;
  if new.status is distinct from old.status
     or new.cancelled_at is distinct from old.cancelled_at
     or new.cancelled_by is distinct from old.cancelled_by
     or new.cancellation_reason is distinct from old.cancellation_reason then
    raise exception 'Charge lifecycle fields are controlled by financial operations';
  end if;
  if (new.client_id is distinct from old.client_id
      or new.client_service_id is distinct from old.client_service_id
      or new.amount is distinct from old.amount
      or new.currency_code is distinct from old.currency_code)
     and exists (
       select 1 from public.payment_allocations pa
       join public.payments p on p.id = pa.payment_id
       where pa.charge_id = old.id and pa.reversed_at is null and p.status = 'confirmed'
     ) then
    raise exception 'A charge with active allocations cannot change financial identity';
  end if;
  new.updated_by := actor;
  return new;
end;
$$;

revoke all on function public.guard_charge_write() from public, anon, authenticated, service_role;
create trigger charges_guard_write before insert or update on public.charges
for each row execute function public.guard_charge_write();

create or replace function public.guard_payment_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if current_user in ('postgres', 'supabase_admin') then return new; end if;
  if actor is null then raise exception 'Authentication required'; end if;
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.payment_methods pm where pm.id = new.payment_method_id and pm.is_active) then
      raise exception 'Payment method is not active';
    end if;
    new.created_by := actor;
    new.status := 'draft';
    new.confirmed_by := null;
    new.confirmed_at := null;
    new.voided_by := null;
    new.voided_at := null;
    new.void_reason := null;
    return new;
  end if;
  raise exception 'Payments can only be changed by financial operations';
end;
$$;

revoke all on function public.guard_payment_write() from public, anon, authenticated, service_role;
create trigger payments_guard_write before insert or update on public.payments
for each row execute function public.guard_payment_write();

create or replace function public.audit_financial_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_action text;
  correlation uuid;
begin
  correlation := nullif(current_setting('app.correlation_id', true), '')::uuid;
  if tg_table_name = 'charges' then
    event_action := case
      when tg_op = 'INSERT' then 'charge.created'
      when new.status = 'cancelled' and old.status <> 'cancelled' then 'charge.cancelled'
      else 'charge.updated'
    end;
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
    values (
      auth.uid(), event_action, 'charge', new.id,
      case when tg_op = 'UPDATE' then jsonb_build_object('concept', old.concept, 'amount', old.amount, 'currency_code', old.currency_code, 'status', old.status, 'due_date', old.due_date) end,
      jsonb_build_object('concept', new.concept, 'amount', new.amount, 'currency_code', new.currency_code, 'status', new.status, 'due_date', new.due_date),
      correlation
    );
  elsif tg_table_name = 'payments' and tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data, correlation_id)
    values (auth.uid(), 'payment.draft_created', 'payment', new.id, jsonb_build_object('amount', new.amount, 'currency_code', new.currency_code, 'status', new.status), new.idempotency_key);
  end if;
  return new;
end;
$$;

revoke all on function public.audit_financial_row() from public, anon, authenticated, service_role;
create trigger charges_audit after insert or update on public.charges
for each row execute function public.audit_financial_row();
create trigger payments_audit_draft after insert on public.payments
for each row execute function public.audit_financial_row();

alter table public.charges enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.receipts enable row level security;
alter table public.idempotency_keys enable row level security;

alter table public.charges force row level security;
alter table public.payment_methods force row level security;
alter table public.payments force row level security;
alter table public.payment_allocations force row level security;
alter table public.receipts force row level security;
alter table public.idempotency_keys force row level security;

revoke all on table public.charges, public.payment_methods, public.payments, public.payment_allocations, public.receipts, public.idempotency_keys from public, anon, authenticated, service_role;
revoke all on table public.charge_balances, public.payment_available_balances from public, anon, authenticated, service_role;
revoke all on sequence public.receipt_number_seq from public, anon, authenticated, service_role;

grant select, insert, update on table public.charges to authenticated;
grant select on table public.payment_methods to authenticated;
grant select, insert on table public.payments to authenticated;
grant select on table public.payment_allocations, public.receipts to authenticated;
grant select on table public.charge_balances, public.payment_available_balances to authenticated;

create policy charges_select on public.charges for select to authenticated using (public.has_permission('charges.read'));
create policy charges_insert on public.charges for insert to authenticated with check (public.has_permission('charges.write'));
create policy charges_update on public.charges for update to authenticated using (public.has_permission('charges.write')) with check (public.has_permission('charges.write'));

create policy payment_methods_select on public.payment_methods for select to authenticated using (public.has_permission('payments.read'));

create policy payments_select on public.payments for select to authenticated using (public.has_permission('payments.read'));
create policy payments_insert on public.payments for insert to authenticated with check (public.has_permission('payments.create'));

create policy payment_allocations_select on public.payment_allocations for select to authenticated using (public.has_permission('payments.read'));
create policy receipts_select on public.receipts for select to authenticated using (public.has_permission('payments.read'));
