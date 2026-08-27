begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

select has_column('public', 'profiles', 'username', 'profiles has username');
select has_function(
  'public',
  'resolve_username_login',
  array['text'],
  'server-only username resolver exists'
);
select has_function(
  'public',
  'update_my_username',
  array['text'],
  'self-service username function exists'
);
select ok(
  not has_function_privilege('anon', 'public.resolve_username_login(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.resolve_username_login(text)', 'execute')
  and has_function_privilege('service_role', 'public.resolve_username_login(text)', 'execute'),
  'username to email resolution is server-only'
);
select ok(
  not has_function_privilege('anon', 'public.update_my_username(text)', 'execute')
  and has_function_privilege('authenticated', 'public.update_my_username(text)', 'execute'),
  'only authenticated users can invoke self username update'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'username.one@example.invalid',
  crypt('Test-only-password-1', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Username One"}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'username.two@example.invalid',
  crypt('Test-only-password-2', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Username Two"}', now(), now()
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);

select is(
  public.update_my_username(' Kenneth_08 '),
  'kenneth_08',
  'username is trimmed and normalized to lowercase'
);
select results_eq(
  $$select username from public.profiles where id = auth.uid()$$,
  array['kenneth_08'::text],
  'the authenticated user updates only their profile'
);
select throws_ok(
  $$select public.update_my_username('no spaces')$$,
  '22023',
  'Invalid username',
  'invalid username format is rejected'
);
select throws_ok(
  $$update public.profiles set username = 'bypass' where id = auth.uid()$$,
  'P0001',
  'Username must be changed through the secure function',
  'direct username updates cannot bypass the audited function'
);
reset role;
select results_eq(
  $$select count(*)::bigint from public.audit_logs where actor_id = '90000000-0000-0000-0000-000000000001' and action = 'profile.username_updated'$$,
  array[1::bigint],
  'a successful username change is audited once'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.update_my_username('KENNETH_08')$$,
  '23505',
  'Username unavailable',
  'case-insensitive username collisions are rejected'
);
select is(
  (select username from public.profiles where id = auth.uid()),
  null,
  'collision does not modify the second user'
);
select results_eq(
  $$with changed as (
    update public.profiles
    set username = 'victim'
    where id = '90000000-0000-0000-0000-000000000001'
    returning id
  ) select count(*)::bigint from changed$$,
  array[0::bigint],
  'RLS prevents a user from modifying another profile username'
);

reset role;
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);
select results_eq(
  $$select email from public.resolve_username_login('KeNnEtH_08')$$,
  array['username.one@example.invalid'::text],
  'server resolver is case-insensitive and returns the matching auth email'
);
select is_empty(
  $$select email from public.resolve_username_login('unknown-user')$$,
  'unknown usernames expose no record'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$select * from public.resolve_username_login('kenneth_08')$$,
  '42501',
  'permission denied for function resolve_username_login',
  'anonymous clients cannot enumerate username to email mappings'
);

select * from finish(true);
rollback;
