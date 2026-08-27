begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'charges', 'charges table exists');
select has_table('public', 'payment_methods', 'payment methods table exists');
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'payment_allocations', 'allocations table exists');
select has_table('public', 'receipts', 'receipts table exists');
select has_table('public', 'idempotency_keys', 'idempotency table exists');
select has_view('public', 'charge_balances', 'charge balance view exists');
select has_view('public', 'payment_available_balances', 'payment available balance view exists');
select results_eq(
  $$select count(*)::bigint from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('charges','payment_methods','payments','payment_allocations','receipts','idempotency_keys') and c.relrowsecurity and c.relforcerowsecurity$$,
  array[6::bigint],
  'RLS is enabled and forced on all financial tables'
);
select is((select count(*) from public.payment_methods), 5::bigint, 'five payment methods are seeded');
select ok(not has_sequence_privilege('anon', 'public.receipt_number_seq', 'update'), 'anon cannot advance receipt sequence');
select ok(not has_sequence_privilege('authenticated', 'public.receipt_number_seq', 'update'), 'authenticated cannot advance receipt sequence');
select ok(not has_sequence_privilege('service_role', 'public.receipt_number_seq', 'update'), 'service role cannot advance receipt sequence');
select is(
  (select count(distinct receipt_number) from (select public.generate_receipt_number() receipt_number from generate_series(1, 100)) generated),
  100::bigint,
  'receipt sequence produces 100 unique values'
);
select ok(public.generate_receipt_number() ~ '^REC-[0-9]{6,}$', 'receipt number has the expected format');

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
  ('50000000-0000-0000-0000-000000000001'::uuid, 'phase4.owner@example.invalid', 'Owner Phase 4'),
  ('50000000-0000-0000-0000-000000000002'::uuid, 'phase4.admin@example.invalid', 'Admin Phase 4'),
  ('50000000-0000-0000-0000-000000000003'::uuid, 'phase4.finance@example.invalid', 'Finance Phase 4'),
  ('50000000-0000-0000-0000-000000000004'::uuid, 'phase4.staff@example.invalid', 'Staff Phase 4'),
  ('50000000-0000-0000-0000-000000000005'::uuid, 'phase4.inactive@example.invalid', 'Inactive Phase 4')
) fixture(id, email, full_name);

alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles p
set role_id = r.id,
    status = case when p.id = '50000000-0000-0000-0000-000000000005'::uuid then 'inactive' else 'active' end
from public.roles r
where p.id::text like '50000000-%'
  and r.code = case p.id
    when '50000000-0000-0000-0000-000000000001'::uuid then 'owner'
    when '50000000-0000-0000-0000-000000000002'::uuid then 'admin'
    when '50000000-0000-0000-0000-000000000003'::uuid then 'finance'
    else 'staff'
  end;
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;

-- These fixtures belong to this transaction. Production validation must not
-- depend on the synthetic rows from supabase/seed.sql.
insert into public.clients (
  id, full_name, client_type, status, registered_on, created_by, updated_by
)
values
  ('31000000-0000-0000-0000-000000000001', 'Cliente financiero A', 'individual', 'active', current_date, '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', 'Cliente financiero B', 'individual', 'active', current_date, '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000003', 'Cliente financiero C', 'business', 'active', current_date, '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001');

insert into public.client_services (
  id, client_id, service_id, start_date, status, created_by, updated_by
)
values (
  '33000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  (select id from public.service_catalog order by name limit 1),
  current_date, 'active',
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001'
);

insert into public.payments (
  id, client_id, amount, currency_code, payment_method_id, idempotency_key,
  created_by
)
values (
  '35000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001', 1000, 'HNL',
  (select id from public.payment_methods where code = 'transfer'),
  '35000000-0000-0000-0000-000000000101',
  '50000000-0000-0000-0000-000000000001'
);

select throws_ok(
  $$insert into public.charges (client_id, concept, amount, created_by, updated_by) values ('31000000-0000-0000-0000-000000000001', 'Zero', 0, '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'zero charge is rejected'
);
select throws_ok(
  $$insert into public.charges (client_id, concept, amount, created_by, updated_by) values ('31000000-0000-0000-0000-000000000001', 'Negative', -1, '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'negative charge is rejected'
);
select throws_ok(
  $$insert into public.payments (client_id, amount, payment_method_id, idempotency_key, created_by) values ('31000000-0000-0000-0000-000000000001', 0, (select id from public.payment_methods limit 1), gen_random_uuid(), '50000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'zero payment is rejected'
);
select throws_ok(
  $$insert into public.payments (client_id, amount, payment_method_id, idempotency_key, created_by) values ('31000000-0000-0000-0000-000000000001', -1, (select id from public.payment_methods limit 1), gen_random_uuid(), '50000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'negative payment is rejected'
);
select throws_ok(
  $$insert into public.payment_allocations (payment_id, charge_id, amount, created_by) values ('35000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 0, '50000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'zero allocation is rejected'
);
select throws_ok(
  $$insert into public.charges (client_id, concept, amount, currency_code, created_by, updated_by) values ('31000000-0000-0000-0000-000000000001', 'Currency', 1, 'hnl', '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'lowercase charge currency is rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.charges (id, client_id, concept, charge_date, due_date, amount, currency_code, created_by, updated_by) values ('51000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Cargo parcial', current_date, current_date + 10, 5000, 'HNL', auth.uid(), auth.uid())$$,
  'owner can create a charge'
);
select is((select created_by from public.charges where id = '51000000-0000-0000-0000-000000000001'), auth.uid(), 'charge actor is derived');
select throws_ok(
  $$insert into public.charges (client_id, client_service_id, concept, amount, created_by, updated_by) values ('31000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000001', 'Cross client service', 100, auth.uid(), auth.uid())$$,
  'P0001', 'Client service must belong to the same client', 'client service must match charge client'
);

insert into public.payments (id, client_id, payment_date, amount, currency_code, payment_method_id, idempotency_key, created_by)
values ('52000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', current_date, 2000, 'HNL', (select id from public.payment_methods where code = 'cash'), '52000000-0000-0000-0000-000000000101', auth.uid());
select lives_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000001', '[{"charge_id":"51000000-0000-0000-0000-000000000001","amount":"2000.00"}]'::jsonb, '52000000-0000-0000-0000-000000000101')$$,
  'owner can confirm a partial payment'
);
select is((select remaining_amount from public.charge_balances where charge_id = '51000000-0000-0000-0000-000000000001'), 3000.00::numeric, 'partial payment leaves correct balance');
select is((select derived_status from public.charge_balances where charge_id = '51000000-0000-0000-0000-000000000001'), 'partial', 'charge becomes partial');
select is((select status from public.charges where id = '51000000-0000-0000-0000-000000000001'), 'partial', 'stored charge status is synchronized');
select ok((select snapshot ?& array['business','receipt_number','client','payment','allocations'] from public.receipts where payment_id = '52000000-0000-0000-0000-000000000001'), 'receipt contains the required snapshot sections');
select ok((select count(*) = 1 from public.audit_logs where action = 'payment.confirmed' and entity_id = '52000000-0000-0000-0000-000000000001'), 'payment confirmation is audited');
select ok((select count(distinct correlation_id) = 1 from public.audit_logs where correlation_id = '52000000-0000-0000-0000-000000000101'), 'confirmation events share one correlation id');

select lives_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000001', '[{"charge_id":"51000000-0000-0000-0000-000000000001","amount":"2000.00"}]'::jsonb, '52000000-0000-0000-0000-000000000101')$$,
  'same idempotent confirmation returns safely'
);
select is((select count(*) from public.receipts where payment_id = '52000000-0000-0000-0000-000000000001'), 1::bigint, 'idempotent confirmation does not duplicate receipt');
select throws_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000001', '[{"charge_id":"51000000-0000-0000-0000-000000000001","amount":"1999.00"}]'::jsonb, '52000000-0000-0000-0000-000000000101')$$,
  'P0001', 'Idempotency key was already used with a different request', 'same key with different payload is rejected'
);
select throws_ok(
  $$update public.payments set status = 'confirmed' where id = '35000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'direct payment status manipulation is denied'
);
select throws_ok(
  $$insert into public.payment_allocations (payment_id, charge_id, amount, created_by) values ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, auth.uid())$$,
  '42501', null, 'direct allocation insert is denied'
);
select throws_ok(
  $$insert into public.receipts (payment_id, receipt_number, snapshot) values ('52000000-0000-0000-0000-000000000001', 'REC-999999', '{}'::jsonb)$$,
  '42501', null, 'direct receipt insert is denied'
);

insert into public.payments (id, client_id, amount, currency_code, payment_method_id, idempotency_key, created_by)
values ('52000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', 4000, 'HNL', (select id from public.payment_methods where code = 'cash'), '52000000-0000-0000-0000-000000000102', auth.uid());
select throws_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000002', '[{"charge_id":"51000000-0000-0000-0000-000000000001","amount":"3001.00"}]'::jsonb, '52000000-0000-0000-0000-000000000102')$$,
  'P0001', 'Allocation exceeds charge balance', 'charge overpayment is rejected'
);
select throws_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000002', '[{"charge_id":"51000000-0000-0000-0000-000000000001","amount":"4001.00"}]'::jsonb, '52000000-0000-0000-0000-000000000102')$$,
  'P0001', 'Allocations exceed payment amount', 'payment over-allocation is rejected'
);

insert into public.charges (id, client_id, concept, amount, currency_code, created_by, updated_by)
values
  ('51000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', 'Otro cliente', 1000, 'HNL', auth.uid(), auth.uid()),
  ('51000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', 'Otra moneda', 1000, 'USD', auth.uid(), auth.uid()),
  ('51000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000001', 'Cancelado', 1000, 'HNL', auth.uid(), auth.uid());
select lives_ok($$select public.cancel_charge('51000000-0000-0000-0000-000000000004', 'Cargo creado por error')$$, 'owner can cancel an unpaid charge');
select is((select status from public.charges where id = '51000000-0000-0000-0000-000000000004'), 'cancelled', 'cancelled charge state is stored');
select throws_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000002', '[{"charge_id":"51000000-0000-0000-0000-000000000002","amount":"100.00"}]'::jsonb, '52000000-0000-0000-0000-000000000102')$$,
  'P0001', 'Payment and charge clients do not match', 'cross-client allocation is rejected'
);
select throws_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000002', '[{"charge_id":"51000000-0000-0000-0000-000000000003","amount":"100.00"}]'::jsonb, '52000000-0000-0000-0000-000000000102')$$,
  'P0001', 'Payment and charge currencies do not match', 'cross-currency allocation is rejected'
);
select throws_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000002', '[{"charge_id":"51000000-0000-0000-0000-000000000004","amount":"100.00"}]'::jsonb, '52000000-0000-0000-0000-000000000102')$$,
  'P0001', 'Cancelled charges cannot receive payments', 'cancelled charge allocation is rejected'
);

select throws_ok($$select public.cancel_charge('51000000-0000-0000-0000-000000000001', 'Attempt with payment')$$,
  'P0001', 'A charge with active payments cannot be cancelled', 'charge with active allocation cannot be cancelled');
select throws_ok($$select * from public.void_payment('35000000-0000-0000-0000-000000000001', 'Draft cannot be voided')$$,
  'P0001', 'Only confirmed payments can be voided', 'draft payment cannot be voided');
select lives_ok($$select * from public.void_payment('52000000-0000-0000-0000-000000000001', 'Corrección sintética autorizada')$$, 'owner can void a confirmed payment');
select is((select status from public.payments where id = '52000000-0000-0000-0000-000000000001'), 'voided', 'payment becomes voided');
select is((select status from public.receipts where payment_id = '52000000-0000-0000-0000-000000000001'), 'voided', 'receipt becomes voided');
select ok((select bool_and(reversed_at is not null) from public.payment_allocations where payment_id = '52000000-0000-0000-0000-000000000001'), 'allocations become reversed');
select is((select remaining_amount from public.charge_balances where charge_id = '51000000-0000-0000-0000-000000000001'), 5000.00::numeric, 'void restores charge balance');
select is((select derived_status from public.charge_balances where charge_id = '51000000-0000-0000-0000-000000000001'), 'pending', 'void restores charge status');
select throws_ok($$select * from public.void_payment('52000000-0000-0000-0000-000000000001', 'Second void')$$,
  'P0001', 'Only confirmed payments can be voided', 'voided payment cannot be voided twice');

insert into public.charges (id, client_id, concept, amount, created_by, updated_by)
values
  ('51000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000001', 'Multiple A', 3000, auth.uid(), auth.uid()),
  ('51000000-0000-0000-0000-000000000006', '31000000-0000-0000-0000-000000000001', 'Multiple B', 2000, auth.uid(), auth.uid());
insert into public.payments (id, client_id, amount, currency_code, payment_method_id, idempotency_key, created_by)
values ('52000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', 5000, 'HNL', (select id from public.payment_methods where code = 'transfer'), '52000000-0000-0000-0000-000000000103', auth.uid());
select lives_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000003', '[{"charge_id":"51000000-0000-0000-0000-000000000005","amount":"3000.00"},{"charge_id":"51000000-0000-0000-0000-000000000006","amount":"2000.00"}]'::jsonb, '52000000-0000-0000-0000-000000000103')$$,
  'one payment can settle multiple charges'
);
select is((select count(*) from public.charge_balances where charge_id in ('51000000-0000-0000-0000-000000000005','51000000-0000-0000-0000-000000000006') and derived_status = 'paid'), 2::bigint, 'both charges become paid');

insert into public.payments (id, client_id, amount, currency_code, payment_method_id, idempotency_key, created_by)
values ('52000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000001', 1000, 'HNL', (select id from public.payment_methods where code = 'cash'), '52000000-0000-0000-0000-000000000104', auth.uid());
select lives_ok(
  $$select * from public.confirm_payment('52000000-0000-0000-0000-000000000004', '[{"charge_id":"51000000-0000-0000-0000-000000000001","amount":"700.00"}]'::jsonb, '52000000-0000-0000-0000-000000000104')$$,
  'payment may retain unapplied balance'
);
select is((select available_amount from public.payment_available_balances where payment_id = '52000000-0000-0000-0000-000000000004'), 300.00::numeric, 'unapplied balance is derived correctly');

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select lives_ok($$insert into public.charges (client_id, concept, amount, created_by, updated_by) values ('31000000-0000-0000-0000-000000000002', 'Admin charge', 50, auth.uid(), auth.uid())$$, 'admin can create charges');
select lives_ok($$insert into public.payments (client_id, amount, payment_method_id, idempotency_key, created_by) values ('31000000-0000-0000-0000-000000000002', 50, (select id from public.payment_methods where code = 'cash'), gen_random_uuid(), auth.uid())$$, 'admin can create payment drafts');
select throws_ok($$select public.cancel_charge('51000000-0000-0000-0000-000000000002', 'Admin denied')$$, 'P0001', 'Permission denied', 'admin cannot cancel charges');
select throws_ok($$select * from public.void_payment('52000000-0000-0000-0000-000000000003', 'Admin denied')$$, 'P0001', 'Permission denied', 'admin cannot void payments');

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
select ok((select count(*) > 0 from public.charges), 'finance can read charges');
select ok((select count(*) > 0 from public.payments), 'finance can read payments');
select ok((select count(*) = 5 from public.payment_methods), 'finance can read payment methods');
select lives_ok($$insert into public.charges (client_id, concept, amount, created_by, updated_by) values ('31000000-0000-0000-0000-000000000003', 'Finance charge', 50, auth.uid(), auth.uid())$$, 'finance can create charges');
select throws_ok($$select public.cancel_charge('51000000-0000-0000-0000-000000000002', 'Finance denied')$$, 'P0001', 'Permission denied', 'finance cannot cancel charges');
select throws_ok($$select * from public.void_payment('52000000-0000-0000-0000-000000000003', 'Finance denied')$$, 'P0001', 'Permission denied', 'finance cannot void payments');

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.charges), 0::bigint, 'staff cannot read charges');
select is((select count(*) from public.payments), 0::bigint, 'staff cannot read payments');
select is((select count(*) from public.receipts), 0::bigint, 'staff cannot read receipts by known URL id');
select throws_ok($$insert into public.charges (client_id, concept, amount, created_by, updated_by) values ('31000000-0000-0000-0000-000000000001', 'Staff denied', 10, auth.uid(), auth.uid())$$, '42501', null, 'staff cannot create charges');
select throws_ok($$select * from public.search_payments(null, null, null, null, null, null, 1, 20)$$, 'P0001', 'Permission denied', 'staff cannot call financial search');

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.charges), 0::bigint, 'inactive user cannot read charges');
select is((select count(*) from public.payments), 0::bigint, 'inactive user cannot read payments');

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select * from public.charges$$, '42501', null, 'anon cannot read charges');
select throws_ok($$select * from public.payments$$, '42501', null, 'anon cannot read payments');
select ok(not has_function_privilege('anon', 'public.confirm_payment(uuid,jsonb,uuid)', 'execute'), 'anon cannot execute confirm payment');
select ok(not has_function_privilege('anon', 'public.void_payment(uuid,text)', 'execute'), 'anon cannot execute void payment');
select ok(not has_function_privilege('anon', 'public.cancel_charge(uuid,text)', 'execute'), 'anon cannot execute cancel charge');
select ok(not has_table_privilege('service_role', 'public.charges', 'insert'), 'service role has no direct charge insert grant');
select ok(not has_table_privilege('service_role', 'public.payments', 'insert'), 'service role has no direct payment insert grant');
select ok(not has_table_privilege('authenticated', 'public.payment_allocations', 'insert'), 'authenticated has no allocation insert grant');
select ok(not has_table_privilege('authenticated', 'public.receipts', 'insert'), 'authenticated has no receipt insert grant');
select ok(not has_table_privilege('authenticated', 'public.charges', 'delete'), 'authenticated has no charge delete grant');
select ok(not has_table_privilege('authenticated', 'public.payments', 'delete'), 'authenticated has no payment delete grant');

select * from finish(true);
rollback;
