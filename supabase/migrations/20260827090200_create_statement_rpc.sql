create or replace function public.search_client_accounts(
  search_query text default null,
  currency_filter text default null,
  balance_filter text default 'all',
  sort_by text default 'client_name',
  sort_direction text default 'asc',
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  client_id uuid,
  client_code text,
  client_name text,
  currency_code text,
  total_charged numeric,
  total_applied numeric,
  outstanding_balance numeric,
  overdue_balance numeric,
  not_due_balance numeric,
  unapplied_credit numeric,
  open_charges_count integer,
  overdue_charges_count integer,
  oldest_due_date date,
  is_delinquent boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('charges.read')
     or not public.has_permission('payments.read') then
    raise exception 'Permission denied';
  end if;
  if page_number < 1
     or page_size not in (20, 50, 100)
     or length(coalesce(search_query, '')) > 160
     or (currency_filter is not null and currency_filter !~ '^[A-Z]{3}$')
     or balance_filter not in ('all', 'outstanding', 'overdue', 'current')
     or sort_by not in ('client_name', 'outstanding_balance', 'overdue_balance', 'oldest_due_date')
     or sort_direction not in ('asc', 'desc') then
    raise exception 'Invalid search parameters';
  end if;

  return query
  select
    s.client_id,
    s.client_code,
    s.client_name,
    s.currency_code,
    s.total_charged,
    s.total_applied,
    s.outstanding_balance,
    s.overdue_balance,
    s.not_due_balance,
    s.unapplied_credit,
    s.open_charges_count,
    s.overdue_charges_count,
    s.oldest_open_due_date,
    s.is_delinquent,
    count(*) over()
  from public.client_account_summary s
  where (currency_filter is null or s.currency_code = currency_filter)
    and (
      nullif(btrim(search_query), '') is null
      or s.client_name ilike '%' || btrim(search_query) || '%'
      or s.client_code ilike '%' || btrim(search_query) || '%'
    )
    and case balance_filter
      when 'outstanding' then s.outstanding_balance > 0
      when 'overdue' then s.overdue_balance > 0
      when 'current' then s.overdue_balance = 0
      else true
    end
  order by
    case when sort_by = 'client_name' and sort_direction = 'asc' then lower(s.client_name) end asc,
    case when sort_by = 'client_name' and sort_direction = 'desc' then lower(s.client_name) end desc,
    case when sort_by = 'outstanding_balance' and sort_direction = 'asc' then s.outstanding_balance end asc,
    case when sort_by = 'outstanding_balance' and sort_direction = 'desc' then s.outstanding_balance end desc,
    case when sort_by = 'overdue_balance' and sort_direction = 'asc' then s.overdue_balance end asc,
    case when sort_by = 'overdue_balance' and sort_direction = 'desc' then s.overdue_balance end desc,
    case when sort_by = 'oldest_due_date' and sort_direction = 'asc' then s.oldest_open_due_date end asc nulls last,
    case when sort_by = 'oldest_due_date' and sort_direction = 'desc' then s.oldest_open_due_date end desc nulls last,
    s.client_id,
    s.currency_code
  limit page_size offset ((page_number - 1) * page_size);
end;
$$;

revoke all on function public.search_client_accounts(text, text, text, text, text, integer, integer)
from public, anon, authenticated, service_role;

create or replace function public.get_client_statement(
  target_client_id uuid,
  currency_filter text,
  from_date date,
  to_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  effective_to date := coalesce(to_date, current_date);
  effective_from date := coalesce(from_date, (coalesce(to_date, current_date) - interval '1 year')::date);
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_permission('charges.read')
     or not public.has_permission('payments.read') then
    raise exception 'Permission denied';
  end if;
  if target_client_id is null
     or currency_filter is null
     or currency_filter !~ '^[A-Z]{3}$'
     or effective_from > effective_to then
    raise exception 'Invalid statement parameters';
  end if;
  if not exists (select 1 from public.clients c where c.id = target_client_id) then
    raise exception 'Client not found';
  end if;

  with client_row as (
    select c.id, c.client_code, c.full_name, c.email, c.phone, c.whatsapp,
      c.address, c.city, c.country
    from public.clients c
    where c.id = target_client_id
  ), account as (
    select s.*
    from public.client_account_summary s
    where s.client_id = target_client_id and s.currency_code = currency_filter
  ), aging as (
    select a.*
    from public.client_aging_summary a
    where a.client_id = target_client_id and a.currency_code = currency_filter
  ), before_period as (
    select coalesce(sum(a.debit - a.credit), 0)::numeric(14,2) as opening_balance
    from public.client_financial_activity a
    where a.client_id = target_client_id
      and a.currency_code = currency_filter
      and a.event_date < effective_from
  ), period_activity as (
    select a.*
    from public.client_financial_activity a
    where a.client_id = target_client_id
      and a.currency_code = currency_filter
      and a.event_date between effective_from and effective_to
  ), period_totals as (
    select
      coalesce(sum(a.debit) filter (where a.movement_type = 'charge'), 0)::numeric(14,2) as charges,
      coalesce(sum(a.credit) filter (where a.movement_type = 'payment'), 0)::numeric(14,2) as applied_payments,
      coalesce(sum(a.debit) filter (where a.movement_type = 'payment_void'), 0)::numeric(14,2) as payment_reversals,
      coalesce(sum(a.credit) filter (where a.movement_type = 'charge_cancelled'), 0)::numeric(14,2) as charge_cancellations,
      coalesce(sum(a.debit), 0)::numeric(14,2) as total_debits,
      coalesce(sum(a.credit), 0)::numeric(14,2) as total_credits
    from period_activity a
  ), movement_rows as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'event_key', a.event_key,
      'source_id', a.source_id,
      'date', a.event_date,
      'type', a.movement_type,
      'reference', a.reference,
      'description', a.description,
      'debit', a.debit,
      'credit', a.credit,
      'applied_amount', a.applied_amount,
      'unapplied_amount', a.unapplied_amount,
      'receipt_id', a.receipt_id,
      'running_balance', a.running_balance
    ) order by a.event_date, a.occurred_at, a.event_key), '[]'::jsonb) as movements
    from period_activity a
  ), open_rows as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'charge_id', o.charge_id,
      'concept', o.concept,
      'charge_date', o.charge_date,
      'due_date', o.due_date,
      'original_amount', o.original_amount,
      'applied_amount', o.applied_amount,
      'remaining_amount', o.remaining_amount,
      'days_overdue', o.days_overdue,
      'aging_bucket', o.aging_bucket,
      'status', o.derived_status
    ) order by o.due_date nulls last, o.charge_date, o.charge_id), '[]'::jsonb) as open_charges
    from public.open_charge_details o
    where o.client_id = target_client_id and o.currency_code = currency_filter
  )
  select jsonb_build_object(
    'client', to_jsonb(c),
    'currency', currency_filter,
    'period', jsonb_build_object('from', effective_from, 'to', effective_to),
    'generated_at', statement_timestamp(),
    'summary', jsonb_build_object(
      'opening_balance', b.opening_balance,
      'period_charges', p.charges,
      'period_applied_payments', p.applied_payments,
      'period_payment_reversals', p.payment_reversals,
      'period_charge_cancellations', p.charge_cancellations,
      'closing_balance', (b.opening_balance + p.total_debits - p.total_credits)::numeric(14,2),
      'total_charged', coalesce(a.total_charged, 0),
      'total_applied', coalesce(a.total_applied, 0),
      'outstanding_balance', coalesce(a.outstanding_balance, 0),
      'overdue_balance', coalesce(a.overdue_balance, 0),
      'not_due_balance', coalesce(a.not_due_balance, 0),
      'unapplied_credit', coalesce(a.unapplied_credit, 0),
      'is_delinquent', coalesce(a.is_delinquent, false)
    ),
    'aging', jsonb_build_object(
      'current', coalesce(g.current_balance, 0),
      '1_30', coalesce(g.balance_1_30, 0),
      '31_60', coalesce(g.balance_31_60, 0),
      '61_90', coalesce(g.balance_61_90, 0),
      '90_plus', coalesce(g.balance_90_plus, 0),
      'as_of', current_date
    ),
    'open_charges', o.open_charges,
    'movements', m.movements
  ) into result
  from client_row c
  cross join before_period b
  cross join period_totals p
  cross join movement_rows m
  cross join open_rows o
  left join account a on true
  left join aging g on true;

  return result;
end;
$$;

revoke all on function public.get_client_statement(uuid, text, date, date)
from public, anon, authenticated, service_role;
