begin;

create extension if not exists pgtap with schema extensions;
select plan(68);

select has_table('public', 'clients', 'clients table exists');
select has_table('public', 'client_notes', 'client_notes table exists');
select has_table('public', 'service_categories', 'service_categories table exists');
select has_table('public', 'service_catalog', 'service_catalog table exists');
select has_table('public', 'client_services', 'client_services table exists');
select results_eq(
  $$select count(*)::bigint from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('clients','client_notes','service_categories','service_catalog','client_services') and c.relrowsecurity and c.relforcerowsecurity$$,
  array[5::bigint],
  'RLS is enabled and forced on all Phase 3 tables'
);
select ok(
  not has_table_privilege('authenticated', 'public.clients', 'delete')
  and not has_table_privilege('authenticated', 'public.client_notes', 'delete')
  and not has_table_privilege('authenticated', 'public.service_categories', 'delete')
  and not has_table_privilege('authenticated', 'public.service_catalog', 'delete')
  and not has_table_privilege('authenticated', 'public.client_services', 'delete'),
  'authenticated users have no DELETE grants'
);
select is(
  (select count(distinct code) from (select public.generate_client_code() code from generate_series(1, 100)) generated),
  100::bigint,
  'sequence produces 100 unique client codes'
);
select ok(public.generate_client_code() ~ '^CLI-[0-9]{6,}$', 'generated client code has the readable format');
select ok(not has_sequence_privilege('anon', 'public.client_code_seq', 'update'), 'anon cannot advance the client code sequence directly');
select ok(not has_sequence_privilege('authenticated', 'public.client_code_seq', 'update'), 'authenticated users cannot advance the client code sequence directly');
select ok(not has_sequence_privilege('service_role', 'public.client_code_seq', 'update'), 'service role has no direct client code sequence grant');
select is((select count(*) from public.service_categories), 6::bigint, 'six DIACA categories are seeded');
select ok((select count(*) >= 9 from public.service_catalog), 'initial service catalog is seeded');

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
  ('40000000-0000-0000-0000-000000000001'::uuid, 'phase3.owner@example.invalid', 'Owner Phase 3'),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'phase3.admin@example.invalid', 'Admin Phase 3'),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'phase3.finance@example.invalid', 'Finance Phase 3'),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'phase3.staff@example.invalid', 'Staff Phase 3'),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'phase3.inactive@example.invalid', 'Inactive Phase 3')
) fixture(id, email, full_name);

alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles p
set role_id = r.id,
    status = case when p.id = '40000000-0000-0000-0000-000000000005'::uuid then 'inactive' else 'active' end
from public.roles r
where p.id::text like '40000000-%'
  and r.code = case p.id
    when '40000000-0000-0000-0000-000000000001'::uuid then 'owner'
    when '40000000-0000-0000-0000-000000000002'::uuid then 'admin'
    when '40000000-0000-0000-0000-000000000003'::uuid then 'finance'
    else 'staff'
  end;
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;

select set_config('test.category_id', (select id::text from public.service_categories order by sort_order limit 1), true);
select set_config('test.service_id', (select id::text from public.service_catalog order by name limit 1), true);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

select ok((select count(*) > 0 from public.clients), 'owner can read clients');
select lives_ok(
  $$insert into public.clients (id, full_name, client_type, status, registered_on, created_by, updated_by) values ('41000000-0000-0000-0000-000000000001', 'Cliente Owner Test', 'individual', 'active', current_date, auth.uid(), auth.uid())$$,
  'owner can create a client'
);
select lives_ok(
  $$update public.clients set city = 'Ciudad Owner' where id = '41000000-0000-0000-0000-000000000001'$$,
  'owner can update a client'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select ok((select count(*) > 0 from public.clients), 'admin can read clients');
select lives_ok(
  $$insert into public.clients (id, full_name, client_type, status, registered_on, created_by, updated_by) values ('41000000-0000-0000-0000-000000000002', 'Cliente Admin Test', 'business', 'active', current_date, auth.uid(), auth.uid())$$,
  'admin can create a client'
);
select lives_ok(
  $$insert into public.service_categories (code, name, sort_order) values ('phase3_admin', 'Categoría Admin Test', 900)$$,
  'admin can create a service category'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
select ok((select count(*) > 0 from public.clients), 'finance can read clients');
select ok((select count(*) > 0 from public.service_catalog), 'finance can read services');
select throws_ok(
  $$insert into public.clients (full_name, client_type, created_by, updated_by) values ('Finance Forbidden', 'individual', auth.uid(), auth.uid())$$,
  '42501', null, 'finance cannot create clients'
);
select results_eq(
  $$with changed as (update public.clients set city = 'Forbidden' where id = '41000000-0000-0000-0000-000000000001' returning id) select count(*)::bigint from changed$$,
  array[0::bigint],
  'finance cannot update clients'
);
select throws_ok(
  $$insert into public.service_catalog (category_id, name, created_by, updated_by) values (current_setting('test.category_id')::uuid, 'Finance Forbidden', auth.uid(), auth.uid())$$,
  '42501', null, 'finance cannot create catalog services'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select ok((select count(*) > 0 from public.clients), 'staff can read clients');
select lives_ok(
  $$insert into public.clients (id, full_name, client_type, email, status, registered_on, created_by, updated_by) values ('41000000-0000-0000-0000-000000000004', 'Cliente Staff Test', 'individual', 'staff.client@example.invalid', 'active', current_date, '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001')$$,
  'staff can create clients'
);
select is(
  (select created_by from public.clients where id = '41000000-0000-0000-0000-000000000004'),
  '40000000-0000-0000-0000-000000000004'::uuid,
  'database derives created_by instead of trusting the browser value'
);
select lives_ok($$update public.clients set phone = '+504 9999-9999' where id = '41000000-0000-0000-0000-000000000004'$$, 'staff can update clients');
select throws_ok($$delete from public.clients where id = '41000000-0000-0000-0000-000000000004'$$, '42501', null, 'staff cannot delete clients');
select lives_ok(
  $$insert into public.client_notes (id, client_id, note, created_by) values ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', 'Nota staff', auth.uid())$$,
  'staff can add notes'
);
select lives_ok(
  $$insert into public.client_services (id, client_id, service_id, start_date, status, created_by, updated_by) values ('43000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', current_setting('test.service_id')::uuid, current_date, 'active', auth.uid(), auth.uid())$$,
  'staff can add client services'
);
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select ok((select count(*) > 0 from public.audit_logs where action = 'client.created' and entity_id = '41000000-0000-0000-0000-000000000004'), 'client creation is audited');
select ok((select count(*) > 0 from public.audit_logs where action = 'client.note.created' and entity_id = '41000000-0000-0000-0000-000000000004'), 'note creation is audited');
select ok((select count(*) > 0 from public.audit_logs where action = 'client_service.created' and entity_id = '41000000-0000-0000-0000-000000000004'), 'client service creation is audited');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);

select throws_ok($$insert into public.clients (full_name, client_type, status, created_by, updated_by) values ('Invalid Status', 'individual', 'deleted', auth.uid(), auth.uid())$$, '23514', null, 'invalid client status is rejected');
select throws_ok($$insert into public.clients (full_name, client_type, created_by, updated_by) values ('Invalid Type', 'government', auth.uid(), auth.uid())$$, '23514', null, 'invalid client type is rejected');
select throws_ok($$insert into public.client_notes (client_id, note, created_by) values ('41000000-0000-0000-0000-000000000004', '  ', auth.uid())$$, '23514', null, 'empty note is rejected');
select throws_ok($$insert into public.service_catalog (category_id, name, standard_price, created_by, updated_by) values (current_setting('test.category_id')::uuid, 'Negative Price', -1, auth.uid(), auth.uid())$$, '23514', null, 'negative standard price is rejected');
select throws_ok($$insert into public.service_catalog (category_id, name, currency_code, created_by, updated_by) values (current_setting('test.category_id')::uuid, 'Lower Currency', 'hnl', auth.uid(), auth.uid())$$, '23514', null, 'lowercase currency is rejected');
select throws_ok($$insert into public.client_services (client_id, service_id, start_date, end_date, created_by, updated_by) values ('41000000-0000-0000-0000-000000000004', current_setting('test.service_id')::uuid, current_date, current_date - 1, auth.uid(), auth.uid())$$, '23514', null, 'end date before start date is rejected');
select throws_ok($$insert into public.client_services (client_id, service_id, start_date, agreed_price, created_by, updated_by) values ('41000000-0000-0000-0000-000000000004', current_setting('test.service_id')::uuid, current_date, -10, auth.uid(), auth.uid())$$, '23514', null, 'negative agreed price is rejected');
select throws_ok($$insert into public.client_services (client_id, service_id, start_date, billing_mode, created_by, updated_by) values ('41000000-0000-0000-0000-000000000004', current_setting('test.service_id')::uuid, current_date, 'weekly', auth.uid(), auth.uid())$$, '23514', null, 'invalid billing mode is rejected');
select throws_ok($$insert into public.client_services (client_id, service_id, start_date, status, created_by, updated_by) values ('41000000-0000-0000-0000-000000000004', current_setting('test.service_id')::uuid, current_date, 'paid', auth.uid(), auth.uid())$$, '23514', null, 'invalid service status is rejected');
select throws_ok($$insert into public.clients (client_code, full_name, client_type, created_by, updated_by) select client_code, 'Duplicate Code', 'individual', auth.uid(), auth.uid() from public.clients limit 1$$, '23505', null, 'duplicate client code is rejected');
select throws_ok($$insert into public.client_services (client_id, service_id, start_date, created_by, updated_by) values ('41000000-0000-0000-0000-000000000004', '49999999-9999-9999-9999-999999999999', current_date, auth.uid(), auth.uid())$$, '23503', null, 'unknown service id is rejected');
select throws_ok($$insert into public.client_notes (client_id, note, created_by) values ('49999999-9999-9999-9999-999999999999', 'Unknown client', auth.uid())$$, '23503', null, 'unknown client id is rejected');
select is((select count(*) from public.search_clients('x'' OR true --', null, 'full_name', 'asc', 1, 20)), 0::bigint, 'search treats injection text as data');
select throws_ok($$select * from public.search_clients(null, null, 'full_name;drop table clients', 'asc', 1, 20)$$, 'P0001', 'Invalid search parameters', 'search rejects an unlisted sort column');
select ok((select count(*) > 0 from public.get_client_activity('41000000-0000-0000-0000-000000000004', 20)), 'staff can read safe client activity');

select lives_ok($$update public.clients set status = 'inactive' where id = '41000000-0000-0000-0000-000000000004'$$, 'staff can inactivate a client');
select ok((select count(*) > 0 from public.get_client_activity('41000000-0000-0000-0000-000000000004', 20) where action = 'client.status_changed'), 'client status change is audited');
select lives_ok($$update public.service_catalog set is_active = not is_active where id = current_setting('test.service_id')::uuid$$, 'staff can toggle catalog status');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select ok((select count(*) > 0 from public.audit_logs where action = 'service.status_changed'), 'catalog status change is audited');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select lives_ok($$update public.service_categories set is_active = not is_active where id = current_setting('test.category_id')::uuid$$, 'staff can toggle category status');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select ok((select count(*) > 0 from public.audit_logs where action = 'service_category.status_changed'), 'category status change is audited');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select lives_ok($$update public.client_services set status = 'completed' where id = '43000000-0000-0000-0000-000000000001'$$, 'staff can complete a client service');
select ok((select count(*) > 0 from public.get_client_activity('41000000-0000-0000-0000-000000000004', 20) where action = 'client_service.status_changed'), 'client service status change is audited');

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.clients), 0::bigint, 'inactive user cannot read clients');
select is((select count(*) from public.service_catalog), 0::bigint, 'inactive user cannot read services');
select throws_ok($$insert into public.clients (full_name, client_type, created_by, updated_by) values ('Inactive Forbidden', 'individual', auth.uid(), auth.uid())$$, '42501', null, 'inactive user cannot create clients');
select throws_ok($$select * from public.get_client_activity('41000000-0000-0000-0000-000000000004', 20)$$, 'P0001', 'Permission denied', 'inactive user cannot read activity function');

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select * from public.clients$$, '42501', null, 'anon cannot select clients');
select throws_ok($$insert into public.clients (full_name, client_type, created_by, updated_by) values ('Anon Forbidden', 'individual', '40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004')$$, '42501', null, 'anon cannot insert clients');
select ok(not has_function_privilege('anon', 'public.search_clients(text,text,text,text,integer,integer)', 'execute'), 'anon cannot execute client search');
select ok(not has_function_privilege('anon', 'public.get_client_activity(uuid,integer)', 'execute'), 'anon cannot execute activity function');
select ok(not has_table_privilege('service_role', 'public.clients', 'insert'), 'service role has no direct client insert grant');
select ok(not has_table_privilege('service_role', 'public.service_catalog', 'update'), 'service role has no direct catalog update grant');

select * from finish();
rollback;
