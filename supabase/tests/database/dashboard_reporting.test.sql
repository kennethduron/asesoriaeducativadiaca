begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function('public', 'get_dashboard_summary', array['date', 'date', 'text'], 'dashboard RPC exists');
select has_function('public', 'get_report_data', array['text','date','date','text','text','text','uuid','uuid','uuid','uuid','text','text','text','integer','integer','boolean'], 'report RPC exists');
select has_function('public', 'record_report_exported', array['text','text','jsonb','integer','uuid'], 'export audit RPC exists');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid, id, 'authenticated', 'authenticated', email,
  crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name), now(), now()
from (values
  ('70000000-0000-0000-0000-000000000001'::uuid, 'phase6.owner@example.invalid', 'Owner Phase 6'),
  ('70000000-0000-0000-0000-000000000002'::uuid, 'phase6.admin@example.invalid', 'Admin Phase 6'),
  ('70000000-0000-0000-0000-000000000003'::uuid, 'phase6.finance@example.invalid', 'Finance Phase 6'),
  ('70000000-0000-0000-0000-000000000004'::uuid, 'phase6.staff@example.invalid', 'Staff Phase 6'),
  ('70000000-0000-0000-0000-000000000005'::uuid, 'phase6.inactive@example.invalid', 'Inactive Phase 6')
) fixture(id, email, full_name);

alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles p
set role_id = r.id,
    status = case when p.id = '70000000-0000-0000-0000-000000000005'::uuid then 'inactive' else 'active' end
from public.roles r
where p.id::text like '70000000-%'
  and r.code = case p.id
    when '70000000-0000-0000-0000-000000000001'::uuid then 'owner'
    when '70000000-0000-0000-0000-000000000002'::uuid then 'admin'
    when '70000000-0000-0000-0000-000000000003'::uuid then 'finance'
    else 'staff'
  end;
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);

insert into public.clients (id, full_name, client_type, email, registered_on, created_by, updated_by)
values ('71000000-0000-0000-0000-000000000001', 'Phase6 Reporting Client', 'individual', '=formula@example.invalid', current_date, auth.uid(), auth.uid());

insert into public.client_services (id, client_id, service_id, start_date, status, created_by, updated_by)
values (
  '71000000-0000-0000-0000-000000000002',
  '71000000-0000-0000-0000-000000000001',
  (select id from public.service_catalog where is_active order by name limit 1),
  current_date, 'active', auth.uid(), auth.uid()
);

insert into public.charges (id, client_id, concept, charge_date, due_date, amount, currency_code, created_by, updated_by)
values
  ('71000000-0000-0000-0000-000000000010', '71000000-0000-0000-0000-000000000001', 'Phase6 billed XTS', current_date - 10, current_date - 1, 1000, 'XTS', auth.uid(), auth.uid()),
  ('71000000-0000-0000-0000-000000000011', '71000000-0000-0000-0000-000000000001', 'Phase6 separate USD', current_date, current_date + 10, 100, 'USD', auth.uid(), auth.uid()),
  ('71000000-0000-0000-0000-000000000012', '71000000-0000-0000-0000-000000000001', 'Phase6 cancelled XTS', current_date - 10, current_date - 1, 999, 'XTS', auth.uid(), auth.uid());
select lives_ok($$select public.cancel_charge('71000000-0000-0000-0000-000000000012', 'Synthetic Phase 6 cancellation')$$, 'cancelled fixture is created');

insert into public.payments (id, client_id, payment_date, amount, currency_code, payment_method_id, idempotency_key, created_by)
values (
  '71000000-0000-0000-0000-000000000020', '71000000-0000-0000-0000-000000000001', current_date, 400, 'XTS',
  (select id from public.payment_methods where code = 'cash'), '71000000-0000-0000-0000-000000000120', auth.uid()
);
select lives_ok(
  $$select * from public.confirm_payment('71000000-0000-0000-0000-000000000020', '[{"charge_id":"71000000-0000-0000-0000-000000000010","amount":"400.00"}]'::jsonb, '71000000-0000-0000-0000-000000000120')$$,
  '400 payment is confirmed and applied'
);

insert into public.payments (id, client_id, payment_date, amount, currency_code, payment_method_id, idempotency_key, created_by)
values (
  '71000000-0000-0000-0000-000000000021', '71000000-0000-0000-0000-000000000001', current_date, 500, 'XTS',
  (select id from public.payment_methods where code = 'cash'), '71000000-0000-0000-0000-000000000121', auth.uid()
);
select lives_ok($$select * from public.confirm_payment('71000000-0000-0000-0000-000000000021', '[]'::jsonb, '71000000-0000-0000-0000-000000000121')$$, 'void fixture is confirmed');
select lives_ok($$select * from public.void_payment('71000000-0000-0000-0000-000000000021', 'Synthetic Phase 6 void')$$, 'void fixture is annulled');

select is(((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial' -> 'billed' ->> 'current')::numeric), 1000.00::numeric, 'dashboard facturado excludes cancelled charges');
select is(((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial' -> 'collected' ->> 'current')::numeric), 400.00::numeric, 'dashboard cobrado excludes voided payments');
select is(((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial' ->> 'outstanding')::numeric), 600.00::numeric, 'dashboard outstanding is derived');
select is(((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial' ->> 'overdue')::numeric), 600.00::numeric, 'dashboard overdue is derived');
select is(((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial' ->> 'unapplied_credit')::numeric), 0.00::numeric, 'voided credit is not counted as unapplied');
select is(((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial' -> 'aging' ->> '1_30')::numeric), 600.00::numeric, 'aging uses remaining amount');
select is(jsonb_array_length(public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial' -> 'top_overdue'), 1, 'top overdue contains the synthetic client');

select is((public.get_report_data(report_kind => 'charges', search_query => 'Phase6', sort_by => 'amount', page_size => 20) ->> 'total_count')::integer, 3, 'charge report includes valid, USD, and cancelled records');
select is((public.get_report_data(report_kind => 'payments', search_query => 'Phase6', sort_by => 'date', page_size => 20) ->> 'total_count')::integer, 2, 'payment report includes confirmed and voided traceability');
select is((public.get_report_data(report_kind => 'clients', search_query => 'Phase6 Reporting', sort_by => 'client', page_size => 20) ->> 'total_count')::integer, 1, 'client report filters safely');
select is((public.get_report_data(report_kind => 'services', search_query => 'Phase6 Reporting', sort_by => 'service', page_size => 20) ->> 'total_count')::integer, 1, 'service report filters safely');
select is((public.get_report_data(report_kind => 'receivables', search_query => 'Phase6 Reporting', status_filter => 'outstanding', sort_by => 'outstanding', page_size => 20) ->> 'total_count')::integer, 2, 'receivables keeps XTS and USD as two rows');
select is(jsonb_array_length(public.get_report_data(report_kind => 'receivables', search_query => 'Phase6 Reporting', status_filter => 'outstanding', sort_by => 'outstanding', page_size => 20) -> 'summary'), 2, 'multi-currency summary has two contexts');
select is((public.get_report_data(report_kind => 'aging', search_query => 'Phase6 Reporting', sort_by => 'overdue', page_size => 20) ->> 'total_count')::integer, 2, 'aging report keeps currencies separate');
select throws_ok($$select public.get_report_data(report_kind => 'charges', sort_by => 'amount desc; drop table public.clients', page_size => 20)$$, 'P0001', 'Invalid report parameters', 'sorting injection is rejected');
select throws_ok($$select public.get_report_data(report_kind => 'charges', page_size => 5001, export_request => true)$$, 'P0001', 'Invalid report parameters', 'export limit is enforced');
select lives_ok($$select public.record_report_exported('charges', 'xlsx', '{"currency":"XTS"}'::jsonb, 3, gen_random_uuid())$$, 'owner can audit a successful export');
select is((select count(*) from public.audit_logs where action = 'report.exported' and after_data ->> 'report_type' = 'charges'), 1::bigint, 'export audit contains safe metadata');

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.get_dashboard_summary(current_date - 30, current_date, 'XTS')$$, 'admin can read financial dashboard');
select lives_ok($$select public.get_report_data(report_kind => 'payments', sort_by => 'date', page_size => 20)$$, 'admin can read payment reports');

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);
select lives_ok($$select public.get_dashboard_summary(current_date - 30, current_date, 'XTS')$$, 'finance can read financial dashboard');
select lives_ok($$select public.get_report_data(report_kind => 'aging', sort_by => 'overdue', page_size => 20)$$, 'finance can read aging reports');
select lives_ok($$select public.record_report_exported('aging', 'pdf', '{}'::jsonb, 1, gen_random_uuid())$$, 'finance can audit PDF export');

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000004', true);
select ok((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'clients') is not null, 'staff receives permitted client metrics');
select ok((public.get_dashboard_summary(current_date - 30, current_date, 'XTS') -> 'financial') = 'null'::jsonb, 'staff does not receive financial dashboard data');
select throws_ok($$select public.get_report_data(report_kind => 'charges', sort_by => 'date', page_size => 20)$$, 'P0001', 'Permission denied', 'staff direct report RPC is blocked');
select throws_ok($$select public.get_report_data(report_kind => 'clients', sort_by => 'date', page_size => 20)$$, 'P0001', 'Permission denied', 'staff without reports.read cannot use non-financial report URL');
select throws_ok($$select public.record_report_exported('charges', 'xlsx', '{}'::jsonb, 1, gen_random_uuid())$$, 'P0001', 'Permission denied', 'staff export audit and export path are blocked');

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000005', true);
select throws_ok($$select public.get_dashboard_summary(current_date - 30, current_date, 'XTS')$$, 'P0001', 'Permission denied', 'inactive profile cannot read dashboard');
select throws_ok($$select public.get_report_data(report_kind => 'clients', sort_by => 'date', page_size => 20)$$, 'P0001', 'Permission denied', 'inactive profile cannot read reports');

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select ok(not has_function_privilege('anon', 'public.get_dashboard_summary(date,date,text)', 'execute'), 'anon cannot execute dashboard RPC');
select ok(not has_function_privilege('anon', 'public.get_report_data(text,date,date,text,text,text,uuid,uuid,uuid,uuid,text,text,text,integer,integer,boolean)', 'execute'), 'anon cannot execute report RPC');
select ok(not has_function_privilege('anon', 'public.record_report_exported(text,text,jsonb,integer,uuid)', 'execute'), 'anon cannot execute export audit RPC');

select * from finish();
rollback;
