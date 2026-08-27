begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(50);

-- Neutralize pre-existing local DEV fixtures inside this transaction. Rollback
-- restores them after pgTAP, so the suite is repeatable without deleting users.
alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles set status = 'inactive';
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;
delete from public.audit_logs;

select has_table('public', 'roles', 'roles table exists');
select has_table('public', 'permissions', 'permissions table exists');
select has_table('public', 'role_permissions', 'role_permissions table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'audit_logs', 'audit_logs table exists');

select results_eq(
  $$select count(*)::bigint from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('roles','permissions','role_permissions','profiles','audit_logs') and c.relrowsecurity and c.relforcerowsecurity$$,
  array[5::bigint],
  'RLS is enabled and forced on every internal table'
);

select has_function('public', 'has_permission', array['text'], 'has_permission(text) exists');
select results_eq(
  $$select prosecdef from pg_proc where oid = 'public.has_permission(text)'::regprocedure$$,
  array[true],
  'has_permission is SECURITY DEFINER'
);
select ok(
  (select proconfig[1] collate "C" = 'search_path=""' collate "C"
   from pg_proc where oid = 'public.has_permission(text)'::regprocedure),
  'has_permission fixes an empty search_path'
);
select ok(not has_function_privilege('anon', 'public.has_permission(text)', 'execute'), 'anon cannot execute has_permission');
select ok(has_function_privilege('authenticated', 'public.has_permission(text)', 'execute'), 'authenticated can execute has_permission');
select ok(has_table_privilege('service_role', 'public.roles', 'select'), 'service role can read roles for provisioning');
select ok(has_table_privilege('service_role', 'public.profiles', 'update'), 'service role can update profiles for provisioning');
select ok(
  not has_table_privilege('service_role', 'public.audit_logs', 'insert')
  and not has_table_privilege('service_role', 'public.audit_logs', 'update')
  and not has_table_privilege('service_role', 'public.audit_logs', 'delete'),
  'service role has no direct audit mutation grants'
);
select ok(
  not has_table_privilege('service_role', 'public.roles', 'insert')
  and not has_table_privilege('service_role', 'public.roles', 'update')
  and not has_table_privilege('service_role', 'public.roles', 'delete')
  and not has_table_privilege('service_role', 'public.permissions', 'insert')
  and not has_table_privilege('service_role', 'public.role_permissions', 'insert'),
  'service role cannot mutate the RBAC contract directly'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  id,
  'authenticated',
  'authenticated',
  email,
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name),
  now(),
  now()
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'owner.test@example.invalid', 'Owner Test'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'admin.test@example.invalid', 'Admin Test'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'finance.test@example.invalid', 'Finance Test'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'staff.test@example.invalid', 'Staff Test'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'inactive.test@example.invalid', 'Inactive Test')
) as fixture(id, email, full_name);

select is((select count(*) from public.profiles where id::text like '10000000-%'), 5::bigint, 'auth trigger creates every profile');
select results_eq(
  $$select distinct status from public.profiles where id::text like '10000000-%'$$,
  array['inactive'::text],
  'new profiles fail closed as inactive'
);
select results_eq(
  $$select distinct r.code from public.profiles p join public.roles r on r.id = p.role_id where p.id::text like '10000000-%'$$,
  array['staff'::text],
  'new profiles receive the least-privileged staff role'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select lives_ok(
  $$select public.bootstrap_initial_owner('10000000-0000-0000-0000-000000000001'::uuid)$$,
  'service role can perform the one-time owner bootstrap'
);
select throws_ok(
  $$select public.bootstrap_initial_owner('10000000-0000-0000-0000-000000000002'::uuid)$$,
  'P0001',
  'An active owner already exists',
  'owner bootstrap cannot run twice'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

update public.profiles
set role_id = roles.id, status = 'active'
from public.roles
where public.profiles.id = '10000000-0000-0000-0000-000000000002'::uuid and roles.code = 'admin';
update public.profiles
set role_id = roles.id, status = 'active'
from public.roles
where public.profiles.id = '10000000-0000-0000-0000-000000000003'::uuid and roles.code = 'finance';
update public.profiles
set role_id = roles.id, status = 'active'
from public.roles
where public.profiles.id = '10000000-0000-0000-0000-000000000004'::uuid and roles.code = 'staff';

select is((select count(*) from public.permissions), 24::bigint, 'permission contract contains 24 codes');
select is((select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id where r.code = 'owner'), 24::bigint, 'owner has every permission');
select is((select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id where r.code = 'admin'), 20::bigint, 'admin has the documented 20 permissions');
select is((select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id where r.code = 'finance'), 14::bigint, 'finance has the documented 14 permissions');
select is((select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id where r.code = 'staff'), 8::bigint, 'staff has the documented 8 permissions');
select ok(public.has_permission('users.manage'), 'owner has users.manage');
select ok(public.has_permission('payments.void'), 'owner has payments.void');
select ok(not public.has_permission('users.manage'' or true --'), 'permission code is data, not injectable SQL');
select is((select count(*) from public.audit_logs), 7::bigint, 'owner provisioning actions are audited');
select set_config('test.role_id', (select id::text from public.roles where code = 'staff'), true);
select set_config('test.permission_id', (select id::text from public.permissions where code = 'payments.read'), true);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select ok(public.has_permission('audit.read'), 'admin can read audit');
select ok(not public.has_permission('users.manage'), 'admin cannot manage users');
select throws_ok(
  $$update public.profiles set role_id = (select id from public.roles where code = 'owner') where id = '10000000-0000-0000-0000-000000000002'::uuid$$,
  'P0001',
  'Profile field cannot be changed',
  'admin cannot self-assign owner'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select ok(public.has_permission('payments.confirm'), 'finance can confirm payments');
select ok(not public.has_permission('users.manage'), 'finance cannot manage users');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select ok(public.has_permission('clients.write'), 'staff can manage clients');
select ok(not public.has_permission('payments.read'), 'staff has no financial permission');
select is((select count(*) from public.profiles), 1::bigint, 'staff sees only its own profile');
select is((select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000002'::uuid), 0::bigint, 'staff cannot force auth.uid to read another profile');
select is((select count(*) from public.roles), 0::bigint, 'staff cannot read role configuration');
select is((select count(*) from public.permissions), 0::bigint, 'staff cannot read permission configuration');
select is((select count(*) from public.audit_logs), 0::bigint, 'staff cannot read audit logs');
select throws_ok(
  $$insert into public.roles (code, name) values ('attacker', 'Attacker')$$,
  '42501',
  'new row violates row-level security policy for table "roles"',
  'staff cannot create roles'
);
select throws_ok(
  $$insert into public.role_permissions (role_id, permission_id) values (current_setting('test.role_id')::uuid, current_setting('test.permission_id')::uuid)$$,
  '42501',
  'new row violates row-level security policy for table "role_permissions"',
  'staff cannot modify role permissions'
);
select throws_ok(
  $$insert into public.audit_logs (actor_id, action, entity_type) values (auth.uid(), 'forged', 'profile')$$,
  '42501',
  'permission denied for table audit_logs',
  'authenticated clients cannot insert arbitrary audit events'
);
select throws_ok(
  $$update public.audit_logs set action = 'tampered'$$,
  '42501',
  'permission denied for table audit_logs',
  'audit logs cannot be updated by clients'
);
select throws_ok(
  $$delete from public.audit_logs$$,
  '42501',
  'permission denied for table audit_logs',
  'audit logs cannot be deleted by clients'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select ok(not public.has_permission('clients.read'), 'inactive user receives no permissions');
select results_eq(
  $$select status from public.get_my_principal()$$,
  array['inactive'::text],
  'inactive principal remains identifiable for access denial'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  'permission denied for table profiles',
  'anon cannot read internal profiles'
);
select throws_ok(
  $$insert into public.audit_logs (action, entity_type) values ('forged', 'auth_session')$$,
  '42501',
  'permission denied for table audit_logs',
  'anon cannot forge audit events'
);

select * from finish(true);
rollback;
