create view public.client_aging_summary
with (security_invoker = true)
as
select
  o.client_id,
  o.client_code,
  o.client_name,
  o.currency_code,
  coalesce(sum(o.remaining_amount) filter (where o.aging_bucket = 'current'), 0)::numeric(14,2) as current_balance,
  coalesce(sum(o.remaining_amount) filter (where o.aging_bucket = '1_30'), 0)::numeric(14,2) as balance_1_30,
  coalesce(sum(o.remaining_amount) filter (where o.aging_bucket = '31_60'), 0)::numeric(14,2) as balance_31_60,
  coalesce(sum(o.remaining_amount) filter (where o.aging_bucket = '61_90'), 0)::numeric(14,2) as balance_61_90,
  coalesce(sum(o.remaining_amount) filter (where o.aging_bucket = '90_plus'), 0)::numeric(14,2) as balance_90_plus
from public.open_charge_details o
group by o.client_id, o.client_code, o.client_name, o.currency_code;

create view public.client_financial_activity
with (security_invoker = true)
as
with payment_amounts as (
  select
    p.id as payment_id,
    p.client_id,
    p.currency_code::text as currency_code,
    p.payment_date,
    p.amount,
    p.reference_number,
    p.confirmed_at,
    p.voided_at,
    p.void_reason,
    coalesce(sum(pa.amount), 0)::numeric(14,2) as originally_applied,
    (p.amount - coalesce(sum(pa.amount), 0))::numeric(14,2) as originally_unapplied,
    r.id as receipt_id,
    r.receipt_number
  from public.payments p
  left join public.payment_allocations pa on pa.payment_id = p.id
  left join public.receipts r on r.payment_id = p.id
  where p.confirmed_at is not null
  group by p.id, r.id
), raw_activity as (
  select
    'charge:' || c.id::text as event_key,
    c.id as source_id,
    c.client_id,
    c.currency_code::text as currency_code,
    c.charge_date as event_date,
    c.created_at as occurred_at,
    10 as event_order,
    'charge'::text as movement_type,
    coalesce(c.reference, c.id::text) as reference,
    c.concept as description,
    c.amount::numeric(14,2) as debit,
    0::numeric(14,2) as credit,
    null::numeric(14,2) as applied_amount,
    null::numeric(14,2) as unapplied_amount,
    null::uuid as receipt_id
  from public.charges c

  union all

  select
    'payment:' || pa.payment_id::text,
    pa.payment_id,
    pa.client_id,
    pa.currency_code,
    pa.payment_date,
    pa.confirmed_at,
    20,
    'payment',
    coalesce(pa.receipt_number, pa.reference_number, pa.payment_id::text),
    case
      when pa.originally_unapplied > 0 then 'Pago recibido (con crédito no aplicado)'
      else 'Pago recibido'
    end,
    0::numeric(14,2),
    pa.originally_applied,
    pa.originally_applied,
    pa.originally_unapplied,
    pa.receipt_id
  from payment_amounts pa

  union all

  select
    'payment_void:' || pa.payment_id::text,
    pa.payment_id,
    pa.client_id,
    pa.currency_code,
    (pa.voided_at at time zone 'America/Tegucigalpa')::date,
    pa.voided_at,
    30,
    'payment_void',
    coalesce(pa.receipt_number, pa.reference_number, pa.payment_id::text),
    'Reversión de pago' || case when pa.void_reason is null then '' else ': ' || pa.void_reason end,
    pa.originally_applied,
    0::numeric(14,2),
    pa.originally_applied,
    pa.originally_unapplied,
    pa.receipt_id
  from payment_amounts pa
  where pa.voided_at is not null

  union all

  select
    'charge_cancelled:' || c.id::text,
    c.id,
    c.client_id,
    c.currency_code::text,
    (c.cancelled_at at time zone 'America/Tegucigalpa')::date,
    c.cancelled_at,
    40,
    'charge_cancelled',
    coalesce(c.reference, c.id::text),
    'Cancelación de cargo: ' || c.concept,
    0::numeric(14,2),
    c.amount::numeric(14,2),
    null::numeric(14,2),
    null::numeric(14,2),
    null::uuid
  from public.charges c
  where c.status = 'cancelled' and c.cancelled_at is not null
)
select
  a.event_key,
  a.source_id,
  a.client_id,
  a.currency_code,
  a.event_date,
  a.occurred_at,
  a.movement_type,
  a.reference,
  a.description,
  a.debit,
  a.credit,
  a.applied_amount,
  a.unapplied_amount,
  a.receipt_id,
  sum(a.debit - a.credit) over (
    partition by a.client_id, a.currency_code
    order by a.event_date, a.occurred_at, a.event_order, a.event_key
    rows between unbounded preceding and current row
  )::numeric(14,2) as running_balance
from raw_activity a;
