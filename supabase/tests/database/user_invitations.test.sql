begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

select has_table('public', 'user_invitations', 'invitation state table exists');
select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class where oid = 'public.user_invitations'::regclass),
  'invitation state has forced RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_invitations', 'select')
  and not has_table_privilege('authenticated', 'public.user_invitations', 'insert')
  and not has_table_privilege('authenticated', 'public.user_invitations', 'update'),
  'authenticated clients cannot access invitation state directly'
);
select ok(
  has_function_privilege('service_role', 'public.claim_user_invitation(text,text,uuid,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.claim_user_invitation(text,text,uuid,uuid)', 'execute'),
  'only service role can claim invitations'
);
select ok(
  has_function_privilege('authenticated', 'public.get_my_user_invitation()', 'execute')
  and has_function_privilege('authenticated', 'public.complete_user_invitation()', 'execute')
  and not has_function_privilege('anon', 'public.complete_user_invitation()', 'execute'),
  'only authenticated users can inspect and complete their invitation'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '91000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'invite-owner@example.invalid',
  crypt('Owner-Test-Password-1!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Invitation Owner"}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '91000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'pending-finance@example.invalid',
  null, null,
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Pending Finance"}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '91000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated', 'unauthorized@example.invalid',
  crypt('Staff-Test-Password-1!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Unauthorized Staff"}', now(), now()
);

alter table public.profiles disable trigger profiles_guard_update;
update public.profiles p
set role_id = r.id, status = 'active'
from public.roles r
where p.id = '91000000-0000-0000-0000-000000000001' and r.code = 'owner';
update public.profiles p
set status = 'active'
where p.id = '91000000-0000-0000-0000-000000000003';
alter table public.profiles enable trigger profiles_guard_update;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config(
  'test.finance_role_id',
  (select id::text from public.roles where code = 'finance'),
  true
);
select set_config(
  'test.owner_role_id',
  (select id::text from public.roles where code = 'owner'),
  true
);
select lives_ok(
  $$select * from public.claim_user_invitation(
    'PENDING-FINANCE@example.invalid', 'Pending Finance',
    current_setting('test.finance_role_id')::uuid,
    '91000000-0000-0000-0000-000000000001'
  )$$,
  'owner can prepare a normalized invitation'
);
select is(
  (select email from public.user_invitations where user_id is null),
  'pending-finance@example.invalid',
  'email is normalized server-side'
);
select set_config(
  'test.invitation_id',
  (select id::text from public.user_invitations where email='pending-finance@example.invalid'),
  true
);
select throws_ok(
  $$select * from public.claim_user_invitation(
    'other@example.invalid', 'Other User',
    current_setting('test.finance_role_id')::uuid,
    '91000000-0000-0000-0000-000000000003'
  )$$,
  'P0001', 'Invalid invitation actor',
  'staff cannot prepare invitations through the privileged RPC'
);
select lives_ok(
  $$select public.attach_user_invitation(
    (select id from public.user_invitations where email='pending-finance@example.invalid'),
    '91000000-0000-0000-0000-000000000002'
  )$$,
  'service role attaches the existing unconfirmed auth user'
);
select results_eq(
  $$select r.code from public.profiles p join public.roles r on r.id=p.role_id
    where p.id='91000000-0000-0000-0000-000000000002'$$,
  array['finance'::text],
  'attached profile receives the owner-selected role'
);
select results_eq(
  $$select status from public.profiles where id='91000000-0000-0000-0000-000000000002'$$,
  array['inactive'::text],
  'attached profile remains inactive'
);
select lives_ok(
  $$select public.record_user_invitation_delivery(
    (select id from public.user_invitations where email='pending-finance@example.invalid'),
    'sent', 'resend-test-id', null
  )$$,
  'accepted provider delivery is recorded'
);
select results_eq(
  $$select dispatch_status from public.user_invitations where email='pending-finance@example.invalid'$$,
  array['sent'::text],
  'invitation becomes sent exactly once'
);
select throws_ok(
  $$select public.record_user_invitation_delivery(
    (select id from public.user_invitations where email='pending-finance@example.invalid'),
    'sent', 'duplicate-id', null
  )$$,
  'P0001', 'Invitation delivery is not recordable',
  'delivery cannot be recorded twice'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select results_eq(
  $$select role_code from public.get_my_user_invitation()$$,
  array['finance'::text],
  'invitee sees the server-selected finance role'
);
select throws_ok(
  $$update public.profiles set role_id=current_setting('test.owner_role_id')::uuid
    where id=auth.uid()$$,
  'P0001', 'Profile field cannot be changed',
  'invitee cannot promote the pending profile'
);
select throws_ok(
  $$select public.complete_user_invitation()$$,
  'P0001', 'Invitation is not completable',
  'unverified invitation cannot activate'
);

reset role;
update public.user_invitations
set expires_at = statement_timestamp() - interval '1 second'
where email = 'pending-finance@example.invalid';
update auth.users
set email_confirmed_at = clock_timestamp(),
    encrypted_password = crypt('Finance-Test-Password-1!', gen_salt('bf')),
    updated_at = clock_timestamp()
where id = '91000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.complete_user_invitation()$$,
  'P0001', 'Invitation is not completable',
  'expired invitation cannot activate even with a password'
);

reset role;
update auth.users
set email_confirmed_at = clock_timestamp(),
    encrypted_password = null,
    updated_at = clock_timestamp()
where id = '91000000-0000-0000-0000-000000000002';
update public.user_invitations
set expires_at = statement_timestamp() + interval '1 hour'
where email = 'pending-finance@example.invalid';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.complete_user_invitation()$$,
  'P0001', 'Invitation is not completable',
  'verified invite without a password cannot activate'
);

reset role;
update auth.users
set encrypted_password = crypt('Finance-Test-Password-1!', gen_salt('bf')),
    updated_at = now()
where id = '91000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select public.complete_user_invitation()$$,
  'verified invite with a password completes'
);
select results_eq(
  $$select status || ':' || role_code from public.get_my_principal()$$,
  array['active:finance'::text],
  'completion activates the exact assigned role'
);
select results_eq(
  $$select invitation_status from public.get_my_user_invitation()$$,
  array['accepted'::text],
  'invitation is single-use after completion'
);
select throws_ok(
  $$select public.complete_user_invitation()$$,
  'P0001', 'Invitation is not completable',
  'accepted invitation cannot be reused'
);
reset role;
select is(
  (select count(*) from public.user_invitations where email='pending-finance@example.invalid'),
  1::bigint,
  'one email has exactly one invitation record'
);
select results_eq(
  $$select action from public.audit_logs
    where entity_type='user_invitation'
      and entity_id=current_setting('test.invitation_id')::uuid
    order by action$$,
  array[
    'user.invitation.accepted'::text,
    'user.invitation.email_sent'::text,
    'user.invitation.prepared'::text
  ],
  'invitation lifecycle is auditable without token data'
);

select * from finish(true);
rollback;
