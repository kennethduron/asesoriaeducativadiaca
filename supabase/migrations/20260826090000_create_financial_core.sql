create extension if not exists pgcrypto with schema extensions;

create sequence public.receipt_number_seq;

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  client_service_id uuid references public.client_services(id) on delete restrict,
  concept text not null,
  charge_date date not null default current_date,
  due_date date,
  amount numeric(14,2) not null,
  currency_code char(3) not null default 'HNL',
  reference text,
  notes text,
  status text not null default 'pending',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete restrict,
  cancellation_reason text,
  constraint charges_concept_length check (length(btrim(concept)) between 1 and 200),
  constraint charges_dates_valid check (due_date is null or due_date >= charge_date),
  constraint charges_amount_positive check (amount > 0),
  constraint charges_currency_uppercase check (currency_code = upper(currency_code)),
  constraint charges_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint charges_reference_length check (reference is null or length(reference) <= 120),
  constraint charges_notes_length check (notes is null or length(notes) <= 1000),
  constraint charges_status_valid check (status in ('pending', 'partial', 'paid', 'cancelled')),
  constraint charges_cancellation_consistent check (
    (status <> 'cancelled' and cancelled_at is null and cancelled_by is null and cancellation_reason is null)
    or
    (status = 'cancelled' and cancelled_at is not null and cancelled_by is not null and length(btrim(cancellation_reason)) between 3 and 500)
  )
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_methods_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint payment_methods_name_length check (length(btrim(name)) between 2 and 80),
  constraint payment_methods_sort_order_valid check (sort_order between 0 and 10000)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  payment_date date not null default current_date,
  amount numeric(14,2) not null,
  currency_code char(3) not null default 'HNL',
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  reference_number text,
  bank_name text,
  notes text,
  status text not null default 'draft',
  idempotency_key uuid not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  confirmed_by uuid references public.profiles(id) on delete restrict,
  voided_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  constraint payments_amount_positive check (amount > 0),
  constraint payments_currency_uppercase check (currency_code = upper(currency_code)),
  constraint payments_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint payments_reference_length check (reference_number is null or length(reference_number) <= 120),
  constraint payments_bank_length check (bank_name is null or length(bank_name) <= 120),
  constraint payments_notes_length check (notes is null or length(notes) <= 1000),
  constraint payments_status_valid check (status in ('draft', 'confirmed', 'voided')),
  constraint payments_lifecycle_consistent check (
    (status = 'draft' and confirmed_by is null and confirmed_at is null and voided_by is null and voided_at is null and void_reason is null)
    or
    (status = 'confirmed' and confirmed_by is not null and confirmed_at is not null and voided_by is null and voided_at is null and void_reason is null)
    or
    (status = 'voided' and confirmed_by is not null and confirmed_at is not null and voided_by is not null and voided_at is not null and length(btrim(void_reason)) between 3 and 500)
  )
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  charge_id uuid not null references public.charges(id) on delete restrict,
  amount numeric(14,2) not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text,
  constraint payment_allocations_amount_positive check (amount > 0),
  constraint payment_allocations_payment_charge_unique unique (payment_id, charge_id),
  constraint payment_allocations_reversal_consistent check (
    (reversed_at is null and reversed_by is null and reversal_reason is null)
    or
    (reversed_at is not null and reversed_by is not null and length(btrim(reversal_reason)) between 3 and 500)
  )
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  receipt_number text not null unique,
  issued_at timestamptz not null default now(),
  status text not null default 'issued',
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete restrict,
  void_reason text,
  constraint receipts_number_format check (receipt_number ~ '^REC-[0-9]{6,}$'),
  constraint receipts_status_valid check (status in ('issued', 'voided')),
  constraint receipts_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint receipts_void_consistent check (
    (status = 'issued' and voided_at is null and voided_by is null and void_reason is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null and length(btrim(void_reason)) between 3 and 500)
  )
);

create table public.idempotency_keys (
  key uuid primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  operation text not null,
  request_hash text not null,
  status text not null default 'processing',
  result_entity_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint idempotency_operation_length check (length(btrim(operation)) between 3 and 80),
  constraint idempotency_hash_format check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint idempotency_status_valid check (status in ('processing', 'completed', 'failed'))
);

create index charges_client_idx on public.charges(client_id, charge_date desc);
create index charges_client_service_idx on public.charges(client_service_id) where client_service_id is not null;
create index charges_charge_date_idx on public.charges(charge_date desc);
create index charges_due_date_idx on public.charges(due_date) where due_date is not null;
create index charges_status_idx on public.charges(status);
create index payments_client_idx on public.payments(client_id, payment_date desc);
create index payments_payment_date_idx on public.payments(payment_date desc);
create index payments_status_idx on public.payments(status);
create index payments_method_idx on public.payments(payment_method_id);
create index payment_allocations_payment_idx on public.payment_allocations(payment_id);
create index payment_allocations_charge_idx on public.payment_allocations(charge_id);
create index receipts_receipt_number_idx on public.receipts(receipt_number);
create index receipts_payment_idx on public.receipts(payment_id);
create index idempotency_actor_operation_idx on public.idempotency_keys(actor_id, operation, created_at desc);

create trigger charges_set_updated_at before update on public.charges
for each row execute function public.set_updated_at();
create trigger payment_methods_set_updated_at before update on public.payment_methods
for each row execute function public.set_updated_at();

create view public.charge_balances
with (security_invoker = true)
as
select
  c.id as charge_id,
  c.client_id,
  c.client_service_id,
  c.concept,
  c.charge_date,
  c.due_date,
  c.amount as original_amount,
  c.currency_code,
  c.status as stored_status,
  coalesce(sum(pa.amount) filter (where pa.reversed_at is null and p.status = 'confirmed'), 0)::numeric(14,2) as allocated_amount,
  (c.amount - coalesce(sum(pa.amount) filter (where pa.reversed_at is null and p.status = 'confirmed'), 0))::numeric(14,2) as remaining_amount,
  case
    when c.status = 'cancelled' then 'cancelled'
    when c.amount - coalesce(sum(pa.amount) filter (where pa.reversed_at is null and p.status = 'confirmed'), 0) <= 0 then 'paid'
    when coalesce(sum(pa.amount) filter (where pa.reversed_at is null and p.status = 'confirmed'), 0) > 0 then 'partial'
    else 'pending'
  end as derived_status
from public.charges c
left join public.payment_allocations pa on pa.charge_id = c.id
left join public.payments p on p.id = pa.payment_id
group by c.id;

create view public.payment_available_balances
with (security_invoker = true)
as
select
  p.id as payment_id,
  p.client_id,
  p.amount as original_amount,
  p.currency_code,
  coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0)::numeric(14,2) as allocated_amount,
  (p.amount - coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0))::numeric(14,2) as available_amount
from public.payments p
left join public.payment_allocations pa on pa.payment_id = p.id
where p.status = 'confirmed'
group by p.id;
