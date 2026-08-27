begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public','public_requests','public requests table exists');
select has_table('public','public_request_notification_deliveries','public request outbox exists');
select has_function('public','create_public_request',array['uuid','text','text','text','text','text','text','uuid','text'],'public request creation RPC exists');
select has_function('public','claim_public_request_notifications',array['uuid','uuid'],'immediate notification claim RPC exists');
select has_function('public','record_public_request_notification',array['uuid','text','text','text'],'notification result RPC exists');
select results_eq(
  $$select count(*)::bigint from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('public_requests','public_request_notification_deliveries') and c.relrowsecurity and c.relforcerowsecurity$$,
  array[2::bigint], 'public request tables force RLS'
);
select ok(not has_table_privilege('anon','public.public_requests','select'),'anon cannot read public requests');
select ok(not has_function_privilege('anon','public.create_public_request(uuid,text,text,text,text,text,text,uuid,text)','execute'),'anon cannot invoke privileged request creation');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,crypt(gen_random_uuid()::text,gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}',jsonb_build_object('full_name',name),now(),now()
from (values
 ('90000000-0000-0000-0000-000000000001'::uuid,'request.owner@example.invalid','Request Owner'),
 ('90000000-0000-0000-0000-000000000002'::uuid,'request.admin@example.invalid','Request Admin'),
 ('90000000-0000-0000-0000-000000000003'::uuid,'request.finance@example.invalid','Request Finance'),
 ('90000000-0000-0000-0000-000000000004'::uuid,'request.staff@example.invalid','Request Staff'),
 ('90000000-0000-0000-0000-000000000005'::uuid,'request.inactive@example.invalid','Request Inactive')
) f(id,email,name);

alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles p set role_id=r.id,
  status=case when p.id='90000000-0000-0000-0000-000000000005' then 'inactive' else 'active' end
from public.roles r where p.id::text like '90000000-%' and r.code=case p.id
 when '90000000-0000-0000-0000-000000000001' then 'owner'
 when '90000000-0000-0000-0000-000000000002' then 'admin'
 when '90000000-0000-0000-0000-000000000003' then 'finance'
 when '90000000-0000-0000-0000-000000000004' then 'staff'
 else 'admin' end;
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;

insert into public.task_push_tokens(user_id,token_fingerprint,token,is_active)
select id,encode(extensions.digest(id::text,'sha256'),'hex'),'synthetic-public-request-token-'||id,true
from public.profiles where id::text like '90000000-%';

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select lives_ok($$select * from public.create_public_request(
  '91000000-0000-4000-8000-000000000001','Synthetic Request','synthetic.request@example.invalid','+50499990000',
  'Asesoría académica','Normal','Controlled request',gen_random_uuid(),'pgTAP')$$,'service role creates the request');
select lives_ok($$select * from public.create_public_request(
  '91000000-0000-4000-8000-000000000001','Synthetic Request','synthetic.request@example.invalid','+50499990000',
  'Asesoría académica','Normal','Controlled request',gen_random_uuid(),'pgTAP retry')$$,'same idempotency key is accepted as a retry');
select is((select count(*) from public.public_requests where idempotency_key='91000000-0000-4000-8000-000000000001'),1::bigint,'one request persists per idempotency key');
reset role;
select is((select count(*) from public.audit_logs where action='public_request_created' and entity_type='public_request'),1::bigint,'request creation is audited once');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
create temporary table claimed_public_request_deliveries as
select * from public.claim_public_request_notifications(
  (select id from public.public_requests where idempotency_key='91000000-0000-4000-8000-000000000001'),gen_random_uuid()
);
select is((select count(*) from claimed_public_request_deliveries where channel='email'),2::bigint,'only active owner and admin receive email');
select is((select count(*) from claimed_public_request_deliveries where channel='push'),2::bigint,'only active owner and admin devices receive push');
select is((select count(*) from claimed_public_request_deliveries where recipient_user_id in (
  '90000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000004','90000000-0000-0000-0000-000000000005'
)),0::bigint,'finance staff and inactive users are excluded');
select is((select count(*) from public.claim_public_request_notifications(
  (select id from public.public_requests where idempotency_key='91000000-0000-4000-8000-000000000001'),gen_random_uuid()
)),0::bigint,'concurrent or repeated claims cannot duplicate delivery');
select is((select count(*) from public.public_request_notification_deliveries),4::bigint,'one outbox row exists per email recipient and push token');

select public.record_public_request_notification(delivery_id,'sent','synthetic-provider-id')
from claimed_public_request_deliveries where channel='email' limit 1;
select public.record_public_request_notification(delivery_id,'failed',null,'FCM_FAILED')
from claimed_public_request_deliveries where channel='push' limit 1;
reset role;
select is((select count(*) from public.audit_logs where action='admin_email_notification_sent'),1::bigint,'successful email delivery is audited');
select is((select count(*) from public.audit_logs where action='admin_push_notification_failed'),1::bigint,'failed push delivery is audited');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.public_requests),1::bigint,'active owner can read requests');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.public_requests),1::bigint,'active admin can read requests');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',true);
select is((select count(*) from public.public_requests),0::bigint,'finance cannot read requests');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true);
select is((select count(*) from public.public_requests),0::bigint,'staff cannot read requests');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000005',true);
select is((select count(*) from public.public_requests),0::bigint,'inactive admin cannot read requests');

select * from finish(true);
rollback;
