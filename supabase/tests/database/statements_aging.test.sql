begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_view('public', 'open_charge_details', 'open charge details view exists');
select has_view('public', 'client_account_summary', 'account summary view exists');
select has_view('public', 'client_aging_summary', 'aging summary view exists');
select has_view('public', 'client_financial_activity', 'financial activity view exists');
select has_function('public', 'get_client_statement', array['uuid', 'text', 'date', 'date'], 'statement RPC exists');
select has_function('public', 'search_client_accounts', array['text', 'text', 'text', 'text', 'text', 'integer', 'integer'], 'portfolio RPC exists');

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
  ('60000000-0000-0000-0000-000000000001'::uuid, 'phase5.owner@example.invalid', 'Owner Phase 5'),
  ('60000000-0000-0000-0000-000000000002'::uuid, 'phase5.admin@example.invalid', 'Admin Phase 5'),
  ('60000000-0000-0000-0000-000000000003'::uuid, 'phase5.finance@example.invalid', 'Finance Phase 5'),
  ('60000000-0000-0000-0000-000000000004'::uuid, 'phase5.staff@example.invalid', 'Staff Phase 5'),
  ('60000000-0000-0000-0000-000000000005'::uuid, 'phase5.inactive@example.invalid', 'Inactive Phase 5')
) fixture(id, email, full_name);

alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles p
set role_id = r.id,
    status = case when p.id = '60000000-0000-0000-0000-000000000005'::uuid then 'inactive' else 'active' end
from public.roles r
where p.id::text like '60000000-%'
  and r.code = case p.id
    when '60000000-0000-0000-0000-000000000001'::uuid then 'owner'
    when '60000000-0000-0000-0000-000000000002'::uuid then 'admin'
    when '60000000-0000-0000-0000-000000000003'::uuid then 'finance'
    else 'staff'
  end;
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', true);

insert into public.charges (
  id, client_id, concept, charge_date, due_date, amount, currency_code, created_by, updated_by
)
values
  ('61000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Due today', current_date - 5, current_date, 10, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', 'No due date', current_date - 5, null, 20, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', 'One day', current_date - 10, current_date - 1, 30, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000001', 'Thirty days', current_date - 40, current_date - 30, 40, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000001', 'Thirty one days', current_date - 50, current_date - 31, 50, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000006', '31000000-0000-0000-0000-000000000001', 'Sixty days', current_date - 70, current_date - 60, 60, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000007', '31000000-0000-0000-0000-000000000001', 'Sixty one days', current_date - 80, current_date - 61, 70, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000008', '31000000-0000-0000-0000-000000000001', 'Ninety days', current_date - 100, current_date - 90, 80, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000009', '31000000-0000-0000-0000-000000000001', 'Ninety one days', current_date - 110, current_date - 91, 90, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000001', 'Partial sixty days', current_date - 70, current_date - 60, 5000, 'HNL', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000011', '31000000-0000-0000-0000-000000000001', 'USD separate', current_date - 10, current_date + 10, 100, 'USD', auth.uid(), auth.uid()),
  ('61000000-0000-0000-0000-000000000012', '31000000-0000-0000-0000-000000000001', 'Cancelled', current_date - 10, current_date - 1, 999, 'HNL', auth.uid(), auth.uid());

insert into public.payments (
  id, client_id, payment_date, amount, currency_code, payment_method_id, idempotency_key, created_by
)
values (
  '62000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001', current_date, 2000, 'HNL',
  (select id from public.payment_methods where code = 'cash'),
  '62000000-0000-0000-0000-000000000101', auth.uid()
);
select lives_ok(
  $$select * from public.confirm_payment('62000000-0000-0000-0000-000000000001', '[{"charge_id":"61000000-0000-0000-0000-000000000010","amount":"2000.00"}]'::jsonb, '62000000-0000-0000-0000-000000000101')$$,
  'partial payment is confirmed'
);

insert into public.payments (
  id, client_id, payment_date, amount, currency_code, payment_method_id, idempotency_key, created_by
)
values (
  '62000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000001', current_date, 500, 'HNL',
  (select id from public.payment_methods where code = 'transfer'),
  '62000000-0000-0000-0000-000000000102', auth.uid()
);
select lives_ok(
  $$select * from public.confirm_payment('62000000-0000-0000-0000-000000000002', '[]'::jsonb, '62000000-0000-0000-0000-000000000102')$$,
  'payment may remain fully unapplied'
);
select lives_ok(
  $$select public.cancel_charge('61000000-0000-0000-0000-000000000012', 'Synthetic cancellation')$$,
  'unpaid charge can be cancelled'
);

select is((select current_balance from public.client_aging_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'HNL'), 1730.00::numeric, 'due today, null due date, and seeded future charge are current');
select is((select balance_1_30 from public.client_aging_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'HNL'), 70.00::numeric, '1 and 30 days are in 1-30');
select is((select balance_31_60 from public.client_aging_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'HNL'), 3110.00::numeric, '31, 60, and partial balance use 31-60');
select is((select balance_61_90 from public.client_aging_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'HNL'), 150.00::numeric, '61 and 90 days are in 61-90');
select is((select balance_90_plus from public.client_aging_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'HNL'), 90.00::numeric, '91 days is in 90 plus');
select is((select unapplied_credit from public.client_account_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'HNL'), 500.00::numeric, 'unapplied credit stays separate');
select is((select count(*) from public.client_account_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code in ('HNL', 'USD')), 2::bigint, 'currencies have separate summaries');
select is((select total_charged from public.client_account_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'USD'), 100.00::numeric, 'USD is never added to HNL');
select is((select count(*) from public.open_charge_details where charge_id = '61000000-0000-0000-0000-000000000012'), 0::bigint, 'cancelled charge is excluded from open balances');
select ok((select is_delinquent from public.client_account_summary where client_id = '31000000-0000-0000-0000-000000000001' and currency_code = 'HNL'), 'delinquency is derived from overdue balance');

select is(
  ((public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date) -> 'summary' ->> 'closing_balance')::numeric),
  ((public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date) -> 'summary' ->> 'opening_balance')::numeric
    + (public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date) -> 'summary' ->> 'period_charges')::numeric
    + (public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date) -> 'summary' ->> 'period_payment_reversals')::numeric
    - (public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date) -> 'summary' ->> 'period_applied_payments')::numeric
    - (public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date) -> 'summary' ->> 'period_charge_cancellations')::numeric),
  'statement opening plus activity reconciles to closing'
);
select ok(
  jsonb_path_exists(
    public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date, current_date),
    '$.movements[*] ? (@.date == $today)', jsonb_build_object('today', current_date::text)
  ),
  'the to date is inclusive'
);
select throws_ok(
  $$select public.get_client_statement('31000000-0000-0000-0000-000000000001', 'bad', current_date, current_date)$$,
  'P0001', 'Invalid statement parameters', 'invalid currency is rejected'
);
select throws_ok(
  $$select public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date, current_date - 1)$$,
  'P0001', 'Invalid statement parameters', 'reversed range is rejected'
);

insert into public.charges (id, client_id, concept, charge_date, due_date, amount, currency_code, created_by, updated_by)
values ('61000000-0000-0000-0000-000000000013', '31000000-0000-0000-0000-000000000001', 'Void aging', current_date - 40, current_date - 31, 100, 'HNL', auth.uid(), auth.uid());
insert into public.payments (id, client_id, payment_date, amount, currency_code, payment_method_id, idempotency_key, created_by)
values ('62000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', current_date, 40, 'HNL', (select id from public.payment_methods where code = 'cash'), '62000000-0000-0000-0000-000000000103', auth.uid());
select lives_ok(
  $$select * from public.confirm_payment('62000000-0000-0000-0000-000000000003', '[{"charge_id":"61000000-0000-0000-0000-000000000013","amount":"40.00"}]'::jsonb, '62000000-0000-0000-0000-000000000103')$$,
  'void fixture payment confirms'
);
select is((select remaining_amount from public.open_charge_details where charge_id = '61000000-0000-0000-0000-000000000013'), 60.00::numeric, 'aging uses remaining partial amount');
select lives_ok($$select * from public.void_payment('62000000-0000-0000-0000-000000000003', 'Synthetic void')$$, 'payment void succeeds');
select is((select remaining_amount from public.open_charge_details where charge_id = '61000000-0000-0000-0000-000000000013'), 100.00::numeric, 'void restores aging automatically');
select is((select count(*) from public.client_financial_activity where source_id = '62000000-0000-0000-0000-000000000003' and movement_type in ('payment', 'payment_void')), 2::bigint, 'payment and reversal remain explicit');

select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date)$$, 'admin can read statements');
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000003', true);
select lives_ok($$select public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 365, current_date)$$, 'finance can read statements');
select lives_ok($$select public.record_client_statement_generated('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 30, current_date, gen_random_uuid())$$, 'finance can audit a PDF generation');

select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.client_account_summary), 0::bigint, 'staff cannot read account summary rows');
select throws_ok($$select public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 30, current_date)$$, 'P0001', 'Permission denied', 'staff is blocked even with a known client UUID');
select throws_ok($$select public.record_client_statement_generated('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 30, current_date, gen_random_uuid())$$, 'P0001', 'Permission denied', 'staff cannot audit or export a statement');

select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.client_account_summary), 0::bigint, 'inactive user cannot read account summary rows');
select throws_ok($$select public.get_client_statement('31000000-0000-0000-0000-000000000001', 'HNL', current_date - 30, current_date)$$, 'P0001', 'Permission denied', 'inactive user cannot call statement RPC');

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select ok(not has_table_privilege('anon', 'public.client_account_summary', 'select'), 'anon has no account summary grant');
select ok(not has_function_privilege('anon', 'public.get_client_statement(uuid,text,date,date)', 'execute'), 'anon cannot execute statement RPC');
select ok(not has_function_privilege('anon', 'public.record_client_statement_generated(uuid,text,date,date,uuid)', 'execute'), 'anon cannot execute PDF audit RPC');

select * from finish();
rollback;
