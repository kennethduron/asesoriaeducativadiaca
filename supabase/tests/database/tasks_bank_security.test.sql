begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public','tasks','tasks table exists');
select has_table('public','task_reminders','task reminders table exists');
select has_table('public','task_reminder_deliveries','delivery log exists');
select has_table('public','task_push_tokens','owned push tokens table exists');
select has_table('public','rate_limit_buckets','distributed rate limit storage exists');
select has_function('public','create_task',array['text','text','uuid','uuid','uuid','text','timestamp with time zone','jsonb'],'task creation RPC exists');
select has_function('public','claim_due_task_reminders',array['integer','uuid'],'cron claim RPC exists');
select has_function('public','get_bank_report_data',array['date','date','text','text','text','uuid','uuid','text','text','integer','integer','boolean'],'bank report RPC exists');
select col_is_null('public','tasks','assigned_to','legacy tasks may remain unassigned until reviewed');
select has_column('public','tasks','migration_metadata','task migration provenance is preserved separately');
select results_eq(
  $$select count(*)::bigint from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('tasks','task_reminders','task_reminder_deliveries','task_push_tokens','rate_limit_buckets') and c.relrowsecurity and c.relforcerowsecurity$$,
  array[5::bigint], 'all F7 operational tables force RLS'
);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,crypt(gen_random_uuid()::text,gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}',jsonb_build_object('full_name',name),now(),now()
from (values
 ('80000000-0000-0000-0000-000000000001'::uuid,'f7.owner@example.invalid','F7 Owner'),
 ('80000000-0000-0000-0000-000000000002'::uuid,'f7.admin@example.invalid','F7 Admin'),
 ('80000000-0000-0000-0000-000000000003'::uuid,'f7.finance@example.invalid','F7 Finance'),
 ('80000000-0000-0000-0000-000000000004'::uuid,'f7.staff@example.invalid','F7 Staff'),
 ('80000000-0000-0000-0000-000000000005'::uuid,'f7.inactive@example.invalid','F7 Inactive')
) f(id,email,name);
alter table public.profiles disable trigger profiles_guard_update;
alter table public.profiles disable trigger profiles_audit_update;
update public.profiles p set role_id=r.id,status=case when p.id='80000000-0000-0000-0000-000000000005' then 'inactive' else 'active' end
from public.roles r where p.id::text like '80000000-%' and r.code=case p.id
 when '80000000-0000-0000-0000-000000000001' then 'owner'
 when '80000000-0000-0000-0000-000000000002' then 'admin'
 when '80000000-0000-0000-0000-000000000003' then 'finance'
 else 'staff' end;
alter table public.profiles enable trigger profiles_guard_update;
alter table public.profiles enable trigger profiles_audit_update;

insert into public.tasks(
  id,title,description,assigned_to,created_by,priority,status,due_at,migration_metadata
) values (
  '82000000-0000-0000-0000-000000000001','Legacy unassigned task',null,null,
  '80000000-0000-0000-0000-000000000001','normal','pending',
  '2026-05-01T12:00:00Z',
  '{"source":"diaca-crm","legacy_task_id":"legacy-f7-1","legacy_assignee_label":"Equipo DIACA"}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000001',true);
insert into public.clients(id,full_name,client_type,registered_on,created_by,updated_by)
values('81000000-0000-0000-0000-000000000001','F7 Bank Client','individual',current_date,auth.uid(),auth.uid());
insert into public.payments(id,client_id,payment_date,amount,currency_code,payment_method_id,reference_number,idempotency_key,created_by)
values('81000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001',current_date,125,'HNL',(select id from public.payment_methods where code='cash'),'BANK-F7','81000000-0000-0000-0000-000000000099',auth.uid());

select lives_ok($$select public.create_task('Owner assigned task','Synthetic','81000000-0000-0000-0000-000000000001',null,'80000000-0000-0000-0000-000000000003','urgent',statement_timestamp()+interval '1 hour','[{"relative_minutes":60,"push":true,"email":true}]')$$,'owner creates and assigns a task with reminder');
select is((select assigned_name from public.search_tasks(scope_filter=>'all',page_size=>20) where id='82000000-0000-0000-0000-000000000001'),'Sin asignar','owner sees an imported unassigned task');
select is((select migration_metadata->>'legacy_assignee_label' from public.tasks where id='82000000-0000-0000-0000-000000000001'),'Equipo DIACA','legacy team label remains migration-only metadata');
select is((select count(*) from public.tasks where title='Owner assigned task'),1::bigint,'task persists once');
select is((select count(*) from public.task_reminders r join public.tasks t on t.id=r.task_id where t.title='Owner assigned task'),1::bigint,'reminder persists once');
select is((select count(*) from public.audit_logs where action='task.created' and entity_type='task' and entity_id=(select id from public.tasks where title='Owner assigned task')),1::bigint,'task creation is audited');
select lives_ok($$select public.create_task('Custom reminder task','',null,null,'80000000-0000-0000-0000-000000000001','normal','2026-09-02T16:00:00Z','[{"remind_at":"2026-09-02T15:30:00Z","push":true,"email":false}]')$$,'owner creates an absolute custom reminder');
select is((select relative_minutes from public.task_reminders r join public.tasks t on t.id=r.task_id where t.title='Custom reminder task'),null::integer,'custom reminder is stored as an absolute instant');
select lives_ok($$select public.register_task_push_token('synthetic-owner-device-token',encode(extensions.digest('synthetic-owner-device-token','sha256'),'hex'),'pgTAP')$$,'owner registers an owned push token');
select lives_ok($$select public.get_bank_report_data(search_query=>'F7 Bank',sort_by=>'date',page_size=>20)$$,'owner reads generic bank report');
select is((public.get_bank_report_data(search_query=>'F7 Bank',sort_by=>'date',page_size=>20)->>'total_count')::integer,1,'bank report is derived from payments');
select lives_ok($$select public.record_report_exported('bank','xlsx','{}',1,gen_random_uuid())$$,'bank export reuses the audit contract');

select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000003',true);
select is((select count(*) from public.tasks),1::bigint,'finance sees assigned task');
select throws_ok($$select public.create_task('Illegal assignment','',null,null,'80000000-0000-0000-0000-000000000004','normal',now()+interval '1 day','[]')$$,'P0001','Permission denied','finance cannot assign another user');
select lives_ok($$select public.create_task('Finance own task','',null,null,'80000000-0000-0000-0000-000000000003','normal',now()+interval '1 day','[]')$$,'finance creates own task');
select lives_ok($$select public.get_bank_report_data(sort_by=>'amount',page_size=>20)$$,'finance reads bank report');

select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000004',true);
select is((select count(*) from public.tasks),0::bigint,'staff cannot enumerate unrelated tasks');
select is((select count(*) from public.get_task_detail('82000000-0000-0000-0000-000000000001')),0::bigint,'staff cannot read an unassigned legacy task');
select is((select count(*) from public.task_push_tokens),0::bigint,'staff cannot enumerate another user push token');
delete from public.task_push_tokens where token_fingerprint=encode(extensions.digest('synthetic-owner-device-token','sha256'),'hex');
select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.task_push_tokens where token_fingerprint=encode(extensions.digest('synthetic-owner-device-token','sha256'),'hex')),1::bigint,'cross-user token delete is blocked by RLS');
select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.get_bank_report_data(sort_by=>'date',page_size=>20)$$,'P0001','Permission denied','staff cannot read bank report');
select lives_ok($$select public.create_task('Staff own task','',null,null,'80000000-0000-0000-0000-000000000004','low',now()+interval '2 days','[]')$$,'staff creates own task');
select is((select count(*) from public.tasks),1::bigint,'staff sees own task only');

select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000005',true);
select is((select count(*) from public.tasks),0::bigint,'inactive profile sees no tasks');
select throws_ok($$select public.create_task('Inactive task','',null,null,'80000000-0000-0000-0000-000000000005','normal',now()+interval '1 day','[]')$$,'P0001','Permission denied','inactive profile cannot create task');

reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.task_reminders set remind_at=statement_timestamp()-interval '1 minute' where task_id=(select id from public.tasks where title='Owner assigned task');
select is((select count(*) from public.claim_due_task_reminders(50,gen_random_uuid())),1::bigint,'cron claims due reminder once');
select is((select count(*) from public.claim_due_task_reminders(50,gen_random_uuid())),0::bigint,'concurrent/repeated cron cannot immediately reclaim reminder');
select is((select count(*) from public.task_reminder_deliveries where reminder_id=(select r.id from public.task_reminders r join public.tasks t on t.id=r.task_id where t.title='Owner assigned task')),2::bigint,'one delivery exists per requested channel');
update public.tasks set status='completed',completed_at=statement_timestamp(),completed_by=assigned_to where title='Owner assigned task';
select public.record_task_delivery(id,'cancelled') from public.task_reminder_deliveries where reminder_id=(select r.id from public.task_reminders r join public.tasks t on t.id=r.task_id where t.title='Owner assigned task');
select is((select r.status from public.task_reminders r join public.tasks t on t.id=r.task_id where t.title='Owner assigned task'),'cancelled','completion during dispatch keeps reminder cancelled');

reset role;
set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select ok(not has_table_privilege('anon','public.tasks','select'),'anon cannot select tasks');
select ok(not has_function_privilege('anon','public.create_task(text,text,uuid,uuid,uuid,text,timestamp with time zone,jsonb)','execute'),'anon cannot create tasks');
select ok(not has_function_privilege('anon','public.get_bank_report_data(date,date,text,text,text,uuid,uuid,text,text,integer,integer,boolean)','execute'),'anon cannot execute bank report');
select lives_ok($$select * from public.consume_rate_limit('test.scope',repeat('a',64),60,2)$$,'anon can consume opaque distributed rate limit');

select * from finish(true);
rollback;
