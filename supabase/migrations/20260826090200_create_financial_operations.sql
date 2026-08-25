create or replace function public.sync_charge_status(target_charge_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  original_amount numeric(14,2);
  applied_amount numeric(14,2);
  next_status text;
begin
  select c.status, c.amount into current_status, original_amount
  from public.charges c where c.id = target_charge_id for update;
  if not found then raise exception 'Charge not found'; end if;
  if current_status = 'cancelled' then return current_status; end if;

  select coalesce(sum(pa.amount), 0)::numeric(14,2) into applied_amount
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id
  where pa.charge_id = target_charge_id
    and pa.reversed_at is null
    and p.status = 'confirmed';

  next_status := case
    when applied_amount = 0 then 'pending'
    when applied_amount < original_amount then 'partial'
    else 'paid'
  end;
  update public.charges set status = next_status where id = target_charge_id and status <> next_status;
  return next_status;
end;
$$;

revoke all on function public.sync_charge_status(uuid) from public, anon, authenticated, service_role;

create or replace function public.generate_receipt_number()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'REC-' || lpad(nextval('public.receipt_number_seq')::text, 6, '0');
$$;

revoke all on function public.generate_receipt_number() from public, anon, authenticated, service_role;

create or replace function public.confirm_payment(
  target_payment_id uuid,
  allocations_payload jsonb,
  operation_key uuid
)
returns table (
  payment_id uuid,
  receipt_id uuid,
  receipt_number text,
  confirmed_at timestamptz,
  allocated_amount numeric,
  unapplied_amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  payment_row public.payments%rowtype;
  charge_row public.charges%rowtype;
  idempotency_row public.idempotency_keys%rowtype;
  normalized_allocations jsonb;
  allocation_item record;
  request_fingerprint text;
  total_allocated numeric(14,2) := 0;
  charge_remaining numeric(14,2);
  generated_receipt_id uuid := gen_random_uuid();
  generated_receipt_number text;
  operation_time timestamptz := statement_timestamp();
  operation_rows integer;
  client_row public.clients%rowtype;
  method_name text;
  allocation_snapshot jsonb;
  receipt_snapshot jsonb;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not public.has_permission('payments.confirm') then raise exception 'Permission denied'; end if;
  if operation_key is null then raise exception 'Idempotency key is required'; end if;
  if allocations_payload is null or jsonb_typeof(allocations_payload) <> 'array' then
    raise exception 'Allocations must be an array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(allocations_payload) item
    where jsonb_typeof(item) <> 'object'
      or not (item ? 'charge_id' and item ? 'amount')
      or (item ->> 'charge_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (item ->> 'amount') !~ '^[0-9]+([.][0-9]{1,2})?$'
  ) then
    raise exception 'Invalid allocation payload';
  end if;

  select * into payment_row from public.payments p where p.id = target_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if payment_row.created_by <> actor then
    raise exception 'Only the payment creator can confirm this draft';
  end if;
  if payment_row.idempotency_key <> operation_key then
    raise exception 'Idempotency key does not match the payment';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('charge_id', parsed.charge_id::text, 'amount', parsed.amount) order by parsed.charge_id),
    '[]'::jsonb
  ) into normalized_allocations
  from (
    select (item ->> 'charge_id')::uuid as charge_id, (item ->> 'amount')::numeric(14,2) as amount
    from jsonb_array_elements(allocations_payload) item
  ) parsed;

  if (select count(*) from jsonb_array_elements(normalized_allocations)) <>
     (select count(distinct item ->> 'charge_id') from jsonb_array_elements(normalized_allocations) item) then
    raise exception 'Each charge may only appear once';
  end if;
  if exists (select 1 from jsonb_array_elements(normalized_allocations) item where (item ->> 'amount')::numeric <= 0) then
    raise exception 'Allocation amount must be positive';
  end if;

  request_fingerprint := encode(
    extensions.digest(
      convert_to(
        concat_ws('|', target_payment_id::text, payment_row.client_id::text, payment_row.amount::text, payment_row.currency_code, normalized_allocations::text),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.idempotency_keys (key, actor_id, operation, request_hash, status)
  values (operation_key, actor, 'confirm_payment', request_fingerprint, 'processing')
  on conflict (key) do nothing;
  get diagnostics operation_rows = row_count;

  if operation_rows = 0 then
    select * into idempotency_row from public.idempotency_keys i where i.key = operation_key for update;
    if idempotency_row.actor_id <> actor
       or idempotency_row.operation <> 'confirm_payment'
       or idempotency_row.request_hash <> request_fingerprint then
      raise exception 'Idempotency key was already used with a different request';
    end if;
    if idempotency_row.status = 'completed' then
      return query
      select p.id, r.id, r.receipt_number, p.confirmed_at,
        coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0)::numeric,
        (p.amount - coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0))::numeric
      from public.payments p
      join public.receipts r on r.payment_id = p.id
      left join public.payment_allocations pa on pa.payment_id = p.id
      where p.id = target_payment_id
      group by p.id, r.id;
      return;
    end if;
    raise exception 'Payment confirmation is already processing';
  end if;

  if payment_row.status <> 'draft' then raise exception 'Only draft payments can be confirmed'; end if;

  select coalesce(sum((item ->> 'amount')::numeric), 0)::numeric(14,2)
  into total_allocated from jsonb_array_elements(normalized_allocations) item;
  if total_allocated > payment_row.amount then raise exception 'Allocations exceed payment amount'; end if;

  for allocation_item in
    select (item ->> 'charge_id')::uuid as charge_id, (item ->> 'amount')::numeric(14,2) as amount
    from jsonb_array_elements(normalized_allocations) item
    order by (item ->> 'charge_id')::uuid
  loop
    select * into charge_row from public.charges c where c.id = allocation_item.charge_id for update;
    if not found then raise exception 'Charge not found'; end if;
    if charge_row.client_id <> payment_row.client_id then raise exception 'Payment and charge clients do not match'; end if;
    if charge_row.currency_code <> payment_row.currency_code then raise exception 'Payment and charge currencies do not match'; end if;
    if charge_row.status = 'cancelled' then raise exception 'Cancelled charges cannot receive payments'; end if;

    select (charge_row.amount - coalesce(sum(pa.amount), 0))::numeric(14,2)
    into charge_remaining
    from public.payment_allocations pa
    join public.payments existing_payment on existing_payment.id = pa.payment_id
    where pa.charge_id = charge_row.id
      and pa.reversed_at is null
      and existing_payment.status = 'confirmed';
    if charge_remaining is null then charge_remaining := charge_row.amount; end if;
    if allocation_item.amount > charge_remaining then raise exception 'Allocation exceeds charge balance'; end if;

    insert into public.payment_allocations (payment_id, charge_id, amount, created_by)
    values (payment_row.id, charge_row.id, allocation_item.amount, actor);
  end loop;

  update public.payments
  set status = 'confirmed', confirmed_by = actor, confirmed_at = operation_time
  where id = payment_row.id;

  for allocation_item in
    select distinct (item ->> 'charge_id')::uuid as charge_id
    from jsonb_array_elements(normalized_allocations) item
    order by (item ->> 'charge_id')::uuid
  loop
    perform public.sync_charge_status(allocation_item.charge_id);
  end loop;

  generated_receipt_number := public.generate_receipt_number();
  select * into client_row from public.clients c where c.id = payment_row.client_id;
  select pm.name into method_name from public.payment_methods pm where pm.id = payment_row.payment_method_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'charge_id', pa.charge_id,
    'concept', c.concept,
    'amount', pa.amount,
    'currency_code', c.currency_code
  ) order by c.charge_date, c.id), '[]'::jsonb)
  into allocation_snapshot
  from public.payment_allocations pa
  join public.charges c on c.id = pa.charge_id
  where pa.payment_id = payment_row.id and pa.reversed_at is null;

  receipt_snapshot := jsonb_build_object(
    'business', jsonb_build_object('name', 'Asesoría Educativa DIACA'),
    'receipt_number', generated_receipt_number,
    'client', jsonb_build_object('id', client_row.id, 'code', client_row.client_code, 'name', client_row.full_name),
    'payment', jsonb_build_object(
      'id', payment_row.id,
      'date', payment_row.payment_date,
      'amount', payment_row.amount,
      'currency_code', payment_row.currency_code,
      'method', method_name,
      'reference', payment_row.reference_number,
      'allocated_amount', total_allocated,
      'unapplied_amount', payment_row.amount - total_allocated
    ),
    'allocations', allocation_snapshot,
    'issued_at', operation_time
  );

  insert into public.receipts (id, payment_id, receipt_number, issued_at, snapshot)
  values (generated_receipt_id, payment_row.id, generated_receipt_number, operation_time, receipt_snapshot);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  values (actor, 'payment.confirmed', 'payment', payment_row.id,
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', 'confirmed', 'amount', payment_row.amount, 'currency_code', payment_row.currency_code), operation_key);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data, correlation_id)
  select actor, 'payment.allocation.created', 'payment_allocation', pa.id,
    jsonb_build_object('payment_id', pa.payment_id, 'charge_id', pa.charge_id, 'amount', pa.amount), operation_key
  from public.payment_allocations pa where pa.payment_id = payment_row.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data, correlation_id)
  values (actor, 'receipt.issued', 'receipt', generated_receipt_id,
    jsonb_build_object('payment_id', payment_row.id, 'receipt_number', generated_receipt_number), operation_key);

  update public.idempotency_keys
  set status = 'completed', result_entity_id = generated_receipt_id
  where key = operation_key;

  return query select payment_row.id, generated_receipt_id, generated_receipt_number,
    operation_time, total_allocated::numeric, (payment_row.amount - total_allocated)::numeric;
end;
$$;

revoke all on function public.confirm_payment(uuid, jsonb, uuid) from public, anon, service_role;
grant execute on function public.confirm_payment(uuid, jsonb, uuid) to authenticated;

create or replace function public.void_payment(target_payment_id uuid, reason text)
returns table (payment_id uuid, receipt_id uuid, voided_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  payment_row public.payments%rowtype;
  operation_time timestamptz := statement_timestamp();
  operation_correlation uuid := gen_random_uuid();
  target_receipt_id uuid;
  charge_item record;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not public.has_permission('payments.void') then raise exception 'Permission denied'; end if;
  if reason is null or length(btrim(reason)) not between 3 and 500 then raise exception 'A void reason is required'; end if;

  select * into payment_row from public.payments p where p.id = target_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if payment_row.status <> 'confirmed' then raise exception 'Only confirmed payments can be voided'; end if;

  perform pa.id from public.payment_allocations pa where pa.payment_id = payment_row.id order by pa.charge_id for update;
  perform c.id from public.charges c
  where c.id in (select pa.charge_id from public.payment_allocations pa where pa.payment_id = payment_row.id)
  order by c.id for update;

  update public.payment_allocations as pa
  set reversed_at = operation_time, reversed_by = actor, reversal_reason = btrim(reason)
  where pa.payment_id = payment_row.id and pa.reversed_at is null;

  update public.payments
  set status = 'voided', voided_at = operation_time, voided_by = actor, void_reason = btrim(reason)
  where id = payment_row.id;

  update public.receipts as r
  set status = 'voided', voided_at = operation_time, voided_by = actor, void_reason = btrim(reason)
  where r.payment_id = payment_row.id returning r.id into target_receipt_id;
  if target_receipt_id is null then raise exception 'Receipt not found'; end if;

  for charge_item in
    select distinct pa.charge_id from public.payment_allocations pa
    where pa.payment_id = payment_row.id order by pa.charge_id
  loop
    perform public.sync_charge_status(charge_item.charge_id);
  end loop;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  values (actor, 'payment.voided', 'payment', payment_row.id,
    jsonb_build_object('status', 'confirmed'), jsonb_build_object('status', 'voided', 'reason', btrim(reason)), operation_correlation);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  select actor, 'payment.allocation.reversed', 'payment_allocation', pa.id,
    jsonb_build_object('reversed_at', null), jsonb_build_object('reversed_at', operation_time, 'reason', btrim(reason)), operation_correlation
  from public.payment_allocations pa where pa.payment_id = payment_row.id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  values (actor, 'receipt.voided', 'receipt', target_receipt_id,
    jsonb_build_object('status', 'issued'), jsonb_build_object('status', 'voided', 'reason', btrim(reason)), operation_correlation);

  return query select payment_row.id, target_receipt_id, operation_time;
end;
$$;

revoke all on function public.void_payment(uuid, text) from public, anon, service_role;
grant execute on function public.void_payment(uuid, text) to authenticated;

create or replace function public.cancel_charge(target_charge_id uuid, reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  charge_row public.charges%rowtype;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not public.has_permission('charges.cancel') then raise exception 'Permission denied'; end if;
  if reason is null or length(btrim(reason)) not between 3 and 500 then raise exception 'A cancellation reason is required'; end if;
  select * into charge_row from public.charges c where c.id = target_charge_id for update;
  if not found then raise exception 'Charge not found'; end if;
  if charge_row.status = 'cancelled' then raise exception 'Charge is already cancelled'; end if;
  if exists (
    select 1 from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    where pa.charge_id = charge_row.id and pa.reversed_at is null and p.status = 'confirmed'
  ) then raise exception 'A charge with active payments cannot be cancelled'; end if;
  perform set_config('app.correlation_id', gen_random_uuid()::text, true);
  update public.charges set status = 'cancelled', cancelled_at = statement_timestamp(), cancelled_by = actor,
    cancellation_reason = btrim(reason), updated_by = actor where id = charge_row.id;
  return charge_row.id;
end;
$$;

revoke all on function public.cancel_charge(uuid, text) from public, anon, service_role;
grant execute on function public.cancel_charge(uuid, text) to authenticated;

create or replace function public.search_charges(
  search_query text default null,
  client_filter uuid default null,
  status_filter text default null,
  currency_filter text default null,
  date_from date default null,
  date_to date default null,
  due_before date default null,
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  id uuid, client_id uuid, client_code text, client_name text, concept text,
  service_name text, charge_date date, due_date date, original_amount numeric,
  allocated_amount numeric, remaining_amount numeric, currency_code text,
  status text, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('charges.read') then raise exception 'Permission denied'; end if;
  if page_number < 1 or page_size not in (20, 50, 100)
     or (status_filter is not null and status_filter not in ('pending', 'partial', 'paid', 'cancelled'))
     or (currency_filter is not null and currency_filter !~ '^[A-Z]{3}$')
     or (date_from is not null and date_to is not null and date_to < date_from) then
    raise exception 'Invalid search parameters';
  end if;
  return query
  select cb.charge_id, cb.client_id, c.client_code, c.full_name, cb.concept,
    sc.name, cb.charge_date, cb.due_date, cb.original_amount, cb.allocated_amount,
    cb.remaining_amount, cb.currency_code::text, cb.derived_status, count(*) over()
  from public.charge_balances cb
  join public.clients c on c.id = cb.client_id
  left join public.client_services cs on cs.id = cb.client_service_id
  left join public.service_catalog sc on sc.id = cs.service_id
  where (client_filter is null or cb.client_id = client_filter)
    and (status_filter is null or cb.derived_status = status_filter)
    and (currency_filter is null or cb.currency_code = currency_filter)
    and (date_from is null or cb.charge_date >= date_from)
    and (date_to is null or cb.charge_date <= date_to)
    and (due_before is null or cb.due_date <= due_before)
    and (
      nullif(btrim(search_query), '') is null
      or c.full_name ilike '%' || btrim(search_query) || '%'
      or c.client_code ilike '%' || btrim(search_query) || '%'
      or cb.concept ilike '%' || btrim(search_query) || '%'
      or exists (select 1 from public.charges source_charge where source_charge.id = cb.charge_id and source_charge.reference ilike '%' || btrim(search_query) || '%')
    )
  order by cb.charge_date desc, cb.charge_id
  limit page_size offset ((page_number - 1) * page_size);
end;
$$;

revoke all on function public.search_charges(text, uuid, text, text, date, date, date, integer, integer) from public, anon, service_role;
grant execute on function public.search_charges(text, uuid, text, text, date, date, date, integer, integer) to authenticated;

create or replace function public.search_payments(
  search_query text default null,
  client_filter uuid default null,
  status_filter text default null,
  method_filter uuid default null,
  date_from date default null,
  date_to date default null,
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  id uuid, client_id uuid, client_code text, client_name text, payment_date date,
  amount numeric, allocated_amount numeric, unapplied_amount numeric,
  currency_code text, method_name text, status text, receipt_id uuid,
  receipt_number text, created_by_name text, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('payments.read') then raise exception 'Permission denied'; end if;
  if page_number < 1 or page_size not in (20, 50, 100)
     or (status_filter is not null and status_filter not in ('draft', 'confirmed', 'voided'))
     or (date_from is not null and date_to is not null and date_to < date_from) then
    raise exception 'Invalid search parameters';
  end if;
  return query
  select p.id, p.client_id, c.client_code, c.full_name, p.payment_date, p.amount,
    coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0)::numeric,
    case when p.status = 'confirmed' then (p.amount - coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0))::numeric else 0::numeric end,
    p.currency_code::text, pm.name, p.status, r.id, r.receipt_number,
    coalesce(pr.full_name, 'Usuario DIACA'), count(*) over()
  from public.payments p
  join public.clients c on c.id = p.client_id
  join public.payment_methods pm on pm.id = p.payment_method_id
  left join public.payment_allocations pa on pa.payment_id = p.id
  left join public.receipts r on r.payment_id = p.id
  left join public.profiles pr on pr.id = p.created_by
  where (client_filter is null or p.client_id = client_filter)
    and (status_filter is null or p.status = status_filter)
    and (method_filter is null or p.payment_method_id = method_filter)
    and (date_from is null or p.payment_date >= date_from)
    and (date_to is null or p.payment_date <= date_to)
    and (
      nullif(btrim(search_query), '') is null
      or c.full_name ilike '%' || btrim(search_query) || '%'
      or c.client_code ilike '%' || btrim(search_query) || '%'
      or p.reference_number ilike '%' || btrim(search_query) || '%'
      or r.receipt_number ilike '%' || btrim(search_query) || '%'
    )
  group by p.id, c.client_code, c.full_name, pm.name, r.id, pr.full_name
  order by p.payment_date desc, p.created_at desc, p.id
  limit page_size offset ((page_number - 1) * page_size);
end;
$$;

revoke all on function public.search_payments(text, uuid, text, uuid, date, date, integer, integer) from public, anon, service_role;
grant execute on function public.search_payments(text, uuid, text, uuid, date, date, integer, integer) to authenticated;

create or replace function public.get_payment_activity(target_payment_id uuid, result_limit integer default 30)
returns table (id uuid, action text, actor_name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('payments.read') or result_limit not between 1 and 50 then raise exception 'Permission denied'; end if;
  return query
  select a.id, a.action, coalesce(p.full_name, 'Sistema'), a.created_at
  from public.audit_logs a
  left join public.profiles p on p.id = a.actor_id
  where a.correlation_id in (
    select distinct related.correlation_id from public.audit_logs related
    where related.entity_type = 'payment' and related.entity_id = target_payment_id and related.correlation_id is not null
  ) or (a.entity_type = 'payment' and a.entity_id = target_payment_id)
  order by a.created_at desc limit result_limit;
end;
$$;

revoke all on function public.get_payment_activity(uuid, integer) from public, anon, service_role;
grant execute on function public.get_payment_activity(uuid, integer) to authenticated;
