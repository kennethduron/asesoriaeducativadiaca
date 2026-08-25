-- Manual, rollback-only performance scenario for Phase 6.
-- Run with psql against Supabase local; it intentionally is not part of pgTAP.
\timing on
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '72000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'phase6.performance@example.invalid',
  crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Phase 6 Performance Owner"}', now(), now()
);

alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles
set role_id = (select id from public.roles where code = 'owner'), status = 'active'
where id = '72000000-0000-0000-0000-000000000001';
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;

create temporary table phase6_perf_clients (
  id uuid primary key,
  ordinal integer not null
) on commit drop;
insert into phase6_perf_clients
select gen_random_uuid(), value
from generate_series(1, 500) value;
grant select on phase6_perf_clients to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000001', true);

insert into public.clients (
  id, full_name, client_type, email, registered_on, created_by, updated_by
)
select
  id,
  format('Performance Client %s', ordinal),
  'individual',
  format('phase6.performance.%s@example.invalid', ordinal),
  current_date - (ordinal % 365),
  auth.uid(),
  auth.uid()
from phase6_perf_clients;

insert into public.charges (
  client_id, concept, charge_date, due_date, amount, currency_code,
  created_by, updated_by
)
select
  client.id,
  format('Performance Charge %s-%s', client.ordinal, item),
  current_date - ((client.ordinal + item) % 180),
  current_date - ((client.ordinal + item) % 180) + 30,
  50 + ((client.ordinal * item) % 950),
  case when item % 4 = 0 then 'USD' else 'HNL' end,
  auth.uid(),
  auth.uid()
from phase6_perf_clients client
cross join generate_series(1, 5) item;

select count(*) as synthetic_clients
from public.clients
where email like 'phase6.performance.%@example.invalid';
select count(*) as medium_synthetic_charges
from public.charges
where concept like 'Performance Charge %';

explain (analyze, buffers, timing, summary)
select public.get_dashboard_summary(current_date - 180, current_date, 'HNL');

explain (analyze, buffers, timing, summary)
select public.get_report_data(
  report_kind => 'charges',
  date_from => current_date - 180,
  date_to => current_date,
  currency_filter => 'HNL',
  sort_by => 'date',
  page_number => 1,
  page_size => 100
);

insert into public.charges (
  client_id, concept, charge_date, due_date, amount, currency_code,
  created_by, updated_by
)
select
  client.id,
  format('Performance Charge %s-%s', client.ordinal, item),
  current_date - ((client.ordinal + item) % 180),
  current_date - ((client.ordinal + item) % 180) + 30,
  50 + ((client.ordinal * item) % 950),
  case when item % 4 = 0 then 'USD' else 'HNL' end,
  auth.uid(),
  auth.uid()
from phase6_perf_clients client
cross join generate_series(6, 10) item;

select count(*) as large_synthetic_charges
from public.charges
where concept like 'Performance Charge %';

explain (analyze, buffers, timing, summary)
select public.get_dashboard_summary(current_date - 180, current_date, 'HNL');

explain (analyze, buffers, timing, summary)
select public.get_report_data(
  report_kind => 'charges',
  date_from => current_date - 180,
  date_to => current_date,
  currency_filter => 'HNL',
  sort_by => 'date',
  page_number => 1,
  page_size => 5000,
  export_request => true
);

rollback;
