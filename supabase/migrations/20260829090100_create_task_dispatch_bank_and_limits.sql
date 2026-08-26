create or replace function public.can_access_report(report_kind text, needs_export boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and public.has_permission('reports.read')
    and (not needs_export or public.has_permission('reports.export'))
    and case report_kind
      when 'clients' then public.has_permission('clients.read')
      when 'services' then public.has_permission('services.read')
      when 'charges' then public.has_permission('charges.read')
      when 'payments' then public.has_permission('payments.read')
      when 'receivables' then public.has_permission('charges.read') and public.has_permission('payments.read')
      when 'aging' then public.has_permission('charges.read') and public.has_permission('payments.read')
      when 'bank' then public.has_permission('payments.read') and public.has_permission('bank_reports.generate')
      else false
    end;
$$;
revoke all on function public.can_access_report(text, boolean) from public, anon, authenticated, service_role;

create or replace function public.get_bank_report_data(
  date_from date default null,
  date_to date default null,
  currency_filter text default null,
  status_filter text default null,
  search_query text default null,
  client_filter uuid default null,
  method_filter uuid default null,
  sort_by text default 'date',
  sort_direction text default 'desc',
  page_number integer default 1,
  page_size integer default 20,
  export_request boolean default false
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; row_offset integer;
begin
  if auth.uid() is null or not public.can_access_report('bank', export_request) then raise exception 'Permission denied'; end if;
  if page_number < 1
    or (not export_request and page_size not in (20,50,100))
    or (export_request and (page_number <> 1 or page_size < 1 or page_size > 5000))
    or length(coalesce(search_query,'')) > 160
    or (currency_filter is not null and currency_filter !~ '^[A-Z]{3}$')
    or (status_filter is not null and status_filter not in ('draft','confirmed','voided'))
    or (date_from is not null and date_to is not null and (date_from > date_to or date_to-date_from > 730))
    or sort_by not in ('date','client','amount','method','status','reference')
    or sort_direction not in ('asc','desc') then raise exception 'Invalid report parameters'; end if;
  row_offset := (page_number-1)*page_size;
  with filtered as (
    select p.id, p.client_id, c.client_code, c.full_name as client_name,
      p.payment_date, p.reference_number, pm.name as method_name, p.amount,
      coalesce(sum(pa.amount) filter(where pa.reversed_at is null),0)::numeric(14,2) as applied_amount,
      case when p.status='confirmed' then (p.amount-coalesce(sum(pa.amount) filter(where pa.reversed_at is null),0))::numeric(14,2) else 0::numeric(14,2) end as unapplied_amount,
      p.currency_code::text as currency_code, p.status, r.id as receipt_id, r.receipt_number
    from public.payments p
    join public.clients c on c.id=p.client_id
    join public.payment_methods pm on pm.id=p.payment_method_id
    left join public.payment_allocations pa on pa.payment_id=p.id
    left join public.receipts r on r.payment_id=p.id
    where (date_from is null or p.payment_date>=date_from)
      and (date_to is null or p.payment_date<=date_to)
      and (currency_filter is null or p.currency_code=currency_filter)
      and (status_filter is null or p.status=status_filter)
      and (client_filter is null or p.client_id=client_filter)
      and (method_filter is null or p.payment_method_id=method_filter)
      and (nullif(btrim(search_query),'') is null
        or c.full_name ilike '%'||btrim(search_query)||'%'
        or c.client_code ilike '%'||btrim(search_query)||'%'
        or p.reference_number ilike '%'||btrim(search_query)||'%'
        or r.receipt_number ilike '%'||btrim(search_query)||'%')
    group by p.id,c.client_code,c.full_name,pm.name,r.id
  ), ordered as (
    select f.*, row_number() over(order by
      case when sort_by='date' and sort_direction='asc' then f.payment_date end asc,
      case when sort_by='date' and sort_direction='desc' then f.payment_date end desc,
      case when sort_by='client' and sort_direction='asc' then lower(f.client_name) end asc,
      case when sort_by='client' and sort_direction='desc' then lower(f.client_name) end desc,
      case when sort_by='amount' and sort_direction='asc' then f.amount end asc,
      case when sort_by='amount' and sort_direction='desc' then f.amount end desc,
      case when sort_by='method' and sort_direction='asc' then lower(f.method_name) end asc,
      case when sort_by='method' and sort_direction='desc' then lower(f.method_name) end desc,
      case when sort_by='status' and sort_direction='asc' then f.status end asc,
      case when sort_by='status' and sort_direction='desc' then f.status end desc,
      case when sort_by='reference' and sort_direction='asc' then lower(f.reference_number) end asc,
      case when sort_by='reference' and sort_direction='desc' then lower(f.reference_number) end desc,
      f.id) ordinal from filtered f
  ), paged as (select * from ordered order by ordinal limit page_size offset row_offset),
  summary as (
    select currency_code,
      coalesce(sum(amount) filter(where status='confirmed'),0)::numeric(14,2) total_received,
      coalesce(sum(applied_amount) filter(where status='confirmed'),0)::numeric(14,2) total_applied,
      coalesce(sum(unapplied_amount) filter(where status='confirmed'),0)::numeric(14,2) total_unapplied,
      count(*) filter(where status='confirmed')::integer payment_count,
      count(*) filter(where status='voided')::integer voided_count
    from filtered group by currency_code
  )
  select jsonb_build_object('type','bank','total_count',(select count(*) from filtered),
    'summary',coalesce((select jsonb_agg(to_jsonb(s) order by s.currency_code) from summary s),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg(to_jsonb(p)-'ordinal' order by p.ordinal) from paged p),'[]'::jsonb)) into result;
  return result;
end;
$$;
revoke all on function public.get_bank_report_data(date,date,text,text,text,uuid,uuid,text,text,integer,integer,boolean)
from public, anon, authenticated, service_role;
grant execute on function public.get_bank_report_data(date,date,text,text,text,uuid,uuid,text,text,integer,integer,boolean)
to authenticated;

create or replace function public.claim_due_task_reminders(batch_size integer, operation_correlation_id uuid)
returns table(
  reminder_id uuid, task_id uuid, title text, priority text, due_at timestamptz,
  assigned_to uuid, recipient_email text, push_tokens text[], push_delivery_id uuid, email_delivery_id uuid
) language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Permission denied'; end if;
  if batch_size < 1 or batch_size > 100 or operation_correlation_id is null then raise exception 'Invalid claim'; end if;
  return query
  with candidates as (
    select r.id from public.task_reminders r join public.tasks t on t.id=r.task_id
    join public.profiles assigned_profile on assigned_profile.id=t.assigned_to and assigned_profile.status='active'
    where r.remind_at <= statement_timestamp()
      and r.attempt_count < 5
      and t.status in ('pending','in_progress')
      and (
        r.status in ('pending','partially_sent','failed')
        or (r.status='processing' and r.last_attempt_at < statement_timestamp()-interval '10 minutes')
      )
      and (r.last_attempt_at is null or r.last_attempt_at + make_interval(mins => least(60, power(2,r.attempt_count)::integer*5)) <= statement_timestamp())
    order by r.remind_at,r.id for update of r skip locked limit batch_size
  ), claimed as (
    update public.task_reminders r set status='processing', attempt_count=r.attempt_count+1,
      last_attempt_at=statement_timestamp(), correlation_id=operation_correlation_id
    from candidates c where r.id=c.id returning r.*
  ), deliveries as (
    insert into public.task_reminder_deliveries(reminder_id,channel,provider,status,attempt)
    select c.id, channels.channel, case channels.channel when 'push' then 'fcm' else 'resend' end,
      'processing', c.attempt_count
    from claimed c cross join lateral (
      select 'push'::text channel where c.channel_push
      union all select 'email'::text where c.channel_email
    ) channels
    on conflict on constraint task_delivery_once_per_channel do update set
      status=case when public.task_reminder_deliveries.status='sent' then 'sent' else 'processing' end,
      attempt=case when public.task_reminder_deliveries.status='sent' then public.task_reminder_deliveries.attempt else excluded.attempt end,
      error_code=case when public.task_reminder_deliveries.status='sent' then public.task_reminder_deliveries.error_code else null end,
      updated_at=now()
    returning task_reminder_deliveries.id,task_reminder_deliveries.reminder_id,
      task_reminder_deliveries.channel,task_reminder_deliveries.status
  )
  select c.id,c.task_id,t.title,t.priority,t.due_at,t.assigned_to,u.email::text,
    coalesce(array_agg(pt.token order by pt.updated_at desc) filter(where pt.id is not null and pt.is_active),'{}'::text[]),
    (max(d.id::text) filter(where d.channel='push' and d.status<>'sent'))::uuid,
    (max(d.id::text) filter(where d.channel='email' and d.status<>'sent'))::uuid
  from claimed c join public.tasks t on t.id=c.task_id
  join auth.users u on u.id=t.assigned_to
  left join public.task_push_tokens pt on pt.user_id=t.assigned_to and pt.is_active
  left join deliveries d on d.reminder_id=c.id
  group by c.id,c.task_id,t.title,t.priority,t.due_at,t.assigned_to,u.email;
end;
$$;
revoke all on function public.claim_due_task_reminders(integer,uuid) from public, anon, authenticated;
grant execute on function public.claim_due_task_reminders(integer,uuid) to service_role;

create or replace function public.task_reminder_still_dispatchable(target_reminder_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.role()='service_role' and exists(
    select 1 from public.task_reminders r join public.tasks t on t.id=r.task_id
    join public.profiles p on p.id=t.assigned_to
    where r.id=target_reminder_id and r.status='processing' and t.status in ('pending','in_progress') and p.status='active'
  );
$$;
revoke all on function public.task_reminder_still_dispatchable(uuid) from public, anon, authenticated;
grant execute on function public.task_reminder_still_dispatchable(uuid) to service_role;

create or replace function public.record_task_delivery(
  target_delivery_id uuid, delivery_status text, message_id text default null, failure_code text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare target_reminder uuid;
begin
  if auth.role()<>'service_role' or delivery_status not in ('sent','failed','cancelled') then raise exception 'Permission denied'; end if;
  update public.task_reminder_deliveries set status=delivery_status,
    provider_message_id=left(message_id,240), error_code=left(failure_code,120),
    sent_at=case when delivery_status='sent' then statement_timestamp() end
  where id=target_delivery_id returning reminder_id into target_reminder;
  if target_reminder is null then raise exception 'Delivery not found'; end if;
  update public.task_reminders r set
    status=case
      when exists(select 1 from public.tasks t where t.id=r.task_id and t.status in ('completed','cancelled')) then 'cancelled'
      when not exists(select 1 from public.task_reminder_deliveries d where d.reminder_id=r.id and d.status<>'cancelled') then 'cancelled'
      when not exists(select 1 from public.task_reminder_deliveries d where d.reminder_id=r.id and d.status<>'sent') then 'sent'
      when exists(select 1 from public.task_reminder_deliveries d where d.reminder_id=r.id and d.status='sent') then 'partially_sent'
      when r.attempt_count>=5 then 'failed'
      else 'failed' end,
    sent_at=case when not exists(select 1 from public.task_reminder_deliveries d where d.reminder_id=r.id and d.status<>'sent') then statement_timestamp() end
  where r.id=target_reminder;
end;
$$;
revoke all on function public.record_task_delivery(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_task_delivery(uuid,text,text,text) to service_role;

create table public.rate_limit_buckets (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  expires_at timestamptz not null,
  primary key(scope,subject_hash,window_started_at),
  constraint rate_limit_scope_format check(scope ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  constraint rate_limit_hash_format check(subject_hash ~ '^[a-f0-9]{64}$'),
  constraint rate_limit_count_positive check(request_count>0)
);
create index rate_limit_expiry_idx on public.rate_limit_buckets(expires_at);
alter table public.rate_limit_buckets enable row level security;
alter table public.rate_limit_buckets force row level security;
revoke all on table public.rate_limit_buckets from public,anon,authenticated,service_role;

create or replace function public.consume_rate_limit(
  bucket_scope text, bucket_subject_hash text, window_seconds integer, max_requests integer
) returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql security definer set search_path = '' as $$
declare window_start timestamptz; current_count integer;
begin
  if bucket_scope !~ '^[a-z][a-z0-9_.-]{1,63}$' or bucket_subject_hash !~ '^[a-f0-9]{64}$'
    or window_seconds not between 10 and 86400 or max_requests not between 1 and 1000 then raise exception 'Invalid rate limit'; end if;
  delete from public.rate_limit_buckets b where b.scope=bucket_scope and b.subject_hash=bucket_subject_hash and b.expires_at<statement_timestamp();
  window_start := to_timestamp(floor(extract(epoch from statement_timestamp())/window_seconds)*window_seconds);
  insert into public.rate_limit_buckets(scope,subject_hash,window_started_at,request_count,expires_at)
  values(bucket_scope,bucket_subject_hash,window_start,1,window_start+make_interval(secs=>window_seconds*2))
  on conflict(scope,subject_hash,window_started_at) do update set request_count=public.rate_limit_buckets.request_count+1
  returning request_count into current_count;
  return query select current_count<=max_requests, greatest(0,max_requests-current_count),
    case when current_count>max_requests then greatest(1,ceil(extract(epoch from window_start+make_interval(secs=>window_seconds)-statement_timestamp()))::integer) else 0 end;
end;
$$;
revoke all on function public.consume_rate_limit(text,text,integer,integer) from public;
grant execute on function public.consume_rate_limit(text,text,integer,integer) to anon,authenticated;

create or replace function public.record_auth_event(
  event_action text, event_correlation_id uuid default null, event_ip_address inet default null, event_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if event_action not in ('auth.login.success','auth.logout','auth.password.changed') then raise exception 'Unsupported auth audit event'; end if;
  if event_action='auth.login.success' then update public.profiles set last_login_at=statement_timestamp(),updated_by=actor where id=actor; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,correlation_id,ip_address,user_agent)
  values(actor,event_action,'auth_session',actor,event_correlation_id,event_ip_address,left(event_user_agent,512));
end;
$$;
revoke all on function public.record_auth_event(text,uuid,inet,text) from public,anon;
grant execute on function public.record_auth_event(text,uuid,inet,text) to authenticated;
