create view public.open_charge_details
with (security_invoker = true)
as
select
  cb.charge_id,
  cb.client_id,
  c.client_code,
  c.full_name as client_name,
  cb.concept,
  cb.charge_date,
  cb.due_date,
  cb.original_amount,
  cb.allocated_amount as applied_amount,
  cb.remaining_amount,
  cb.currency_code::text as currency_code,
  case
    when cb.due_date is null or cb.due_date >= current_date then 0
    else current_date - cb.due_date
  end as days_overdue,
  case
    when cb.due_date is null or cb.due_date >= current_date then 'current'
    when current_date - cb.due_date between 1 and 30 then '1_30'
    when current_date - cb.due_date between 31 and 60 then '31_60'
    when current_date - cb.due_date between 61 and 90 then '61_90'
    else '90_plus'
  end as aging_bucket,
  case
    when cb.due_date is not null and cb.due_date < current_date then 'overdue'
    when cb.allocated_amount > 0 then 'partial'
    else 'pending'
  end as derived_status
from public.charge_balances cb
join public.clients c on c.id = cb.client_id
where cb.stored_status <> 'cancelled'
  and cb.remaining_amount > 0;

create view public.client_account_summary
with (security_invoker = true)
as
with financial_keys as (
  select c.client_id, c.currency_code::text as currency_code
  from public.charges c
  where c.status <> 'cancelled'
  union
  select p.client_id, p.currency_code::text
  from public.payments p
  where p.status = 'confirmed'
), charge_totals as (
  select
    cb.client_id,
    cb.currency_code::text as currency_code,
    sum(cb.original_amount) filter (where cb.stored_status <> 'cancelled')::numeric(14,2) as total_charged,
    sum(cb.allocated_amount) filter (where cb.stored_status <> 'cancelled')::numeric(14,2) as total_applied,
    sum(cb.remaining_amount) filter (where cb.stored_status <> 'cancelled')::numeric(14,2) as outstanding_balance,
    sum(cb.remaining_amount) filter (
      where cb.stored_status <> 'cancelled' and cb.remaining_amount > 0
        and cb.due_date is not null and cb.due_date < current_date
    )::numeric(14,2) as overdue_balance,
    sum(cb.remaining_amount) filter (
      where cb.stored_status <> 'cancelled' and cb.remaining_amount > 0
        and (cb.due_date is null or cb.due_date >= current_date)
    )::numeric(14,2) as not_due_balance,
    count(*) filter (
      where cb.stored_status <> 'cancelled' and cb.remaining_amount > 0
    )::integer as open_charges_count,
    count(*) filter (
      where cb.stored_status <> 'cancelled' and cb.remaining_amount > 0
        and cb.due_date is not null and cb.due_date < current_date
    )::integer as overdue_charges_count,
    min(cb.due_date) filter (
      where cb.stored_status <> 'cancelled' and cb.remaining_amount > 0
        and cb.due_date is not null
    ) as oldest_open_due_date,
    max(cb.charge_date) filter (where cb.stored_status <> 'cancelled') as last_charge_date
  from public.charge_balances cb
  group by cb.client_id, cb.currency_code
), payment_totals as (
  select
    pab.client_id,
    pab.currency_code::text as currency_code,
    sum(pab.available_amount)::numeric(14,2) as unapplied_credit,
    max(p.payment_date) as last_payment_date
  from public.payment_available_balances pab
  join public.payments p on p.id = pab.payment_id
  group by pab.client_id, pab.currency_code
)
select
  c.id as client_id,
  c.client_code,
  c.full_name as client_name,
  fk.currency_code,
  coalesce(ct.total_charged, 0)::numeric(14,2) as total_charged,
  coalesce(ct.total_applied, 0)::numeric(14,2) as total_applied,
  coalesce(ct.outstanding_balance, 0)::numeric(14,2) as outstanding_balance,
  coalesce(ct.overdue_balance, 0)::numeric(14,2) as overdue_balance,
  coalesce(ct.not_due_balance, 0)::numeric(14,2) as not_due_balance,
  coalesce(pt.unapplied_credit, 0)::numeric(14,2) as unapplied_credit,
  coalesce(ct.open_charges_count, 0)::integer as open_charges_count,
  coalesce(ct.overdue_charges_count, 0)::integer as overdue_charges_count,
  ct.oldest_open_due_date,
  pt.last_payment_date,
  ct.last_charge_date,
  (coalesce(ct.overdue_balance, 0) > 0) as is_delinquent
from financial_keys fk
join public.clients c on c.id = fk.client_id
left join charge_totals ct
  on ct.client_id = fk.client_id and ct.currency_code = fk.currency_code
left join payment_totals pt
  on pt.client_id = fk.client_id and pt.currency_code = fk.currency_code;
