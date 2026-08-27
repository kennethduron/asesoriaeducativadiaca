create table public.public_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  name text not null,
  email text not null,
  phone text,
  service text not null,
  priority text not null default 'Normal',
  message text not null,
  source text not null default 'website',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_requests_name_length check (length(btrim(name)) between 1 and 120),
  constraint public_requests_email_valid check (
    length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  constraint public_requests_phone_length check (phone is null or length(phone) <= 40),
  constraint public_requests_service_valid check (service in (
    'Asesoría académica', 'Servicios legales civiles', 'Redacción profesional',
    'Trámites y registros', 'Digital y tecnología', 'Emprendimiento y finanzas'
  )),
  constraint public_requests_priority_valid check (priority in ('Normal', 'Urgente', 'Solo cotización')),
  constraint public_requests_message_length check (length(btrim(message)) between 1 and 1200),
  constraint public_requests_source_valid check (source = 'website'),
  constraint public_requests_status_valid check (status in ('new', 'reviewing', 'closed'))
);

create index public_requests_created_idx on public.public_requests(created_at desc);
create index public_requests_status_created_idx on public.public_requests(status, created_at desc);

create trigger public_requests_set_updated_at
before update on public.public_requests
for each row execute function public.set_updated_at();

create table public.public_request_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.public_requests(id) on delete cascade,
  channel text not null,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_key text not null,
  provider text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  provider_message_id text,
  error_code text,
  correlation_id uuid,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_request_delivery_channel_valid check (channel in ('email', 'push')),
  constraint public_request_delivery_provider_valid check (
    (channel = 'email' and provider = 'resend') or (channel = 'push' and provider = 'fcm')
  ),
  constraint public_request_delivery_status_valid check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint public_request_delivery_attempt_valid check (attempt_count between 0 and 5),
  constraint public_request_delivery_key_length check (length(recipient_key) between 1 and 128),
  constraint public_request_delivery_message_length check (provider_message_id is null or length(provider_message_id) <= 240),
  constraint public_request_delivery_error_length check (error_code is null or length(error_code) <= 120),
  constraint public_request_delivery_once unique (request_id, channel, recipient_key)
);

create index public_request_deliveries_request_idx
on public.public_request_notification_deliveries(request_id, created_at);
create index public_request_deliveries_status_idx
on public.public_request_notification_deliveries(status, created_at);

create trigger public_request_deliveries_set_updated_at
before update on public.public_request_notification_deliveries
for each row execute function public.set_updated_at();

alter table public.public_requests enable row level security;
alter table public.public_request_notification_deliveries enable row level security;
alter table public.public_requests force row level security;
alter table public.public_request_notification_deliveries force row level security;

revoke all on table public.public_requests, public.public_request_notification_deliveries
from public, anon, authenticated, service_role;
grant select on table public.public_requests to authenticated;
grant select, insert, update on table public.public_requests to service_role;
grant select, insert, update on table public.public_request_notification_deliveries to service_role;

insert into public.permissions(code, name, description)
values ('requests.read', 'Consultar solicitudes públicas', 'Permite consultar solicitudes enviadas desde el sitio público.')
on conflict (code) do update set name=excluded.name, description=excluded.description;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('owner', 'admin') and p.code='requests.read'
on conflict do nothing;

create policy public_requests_select_authorized
on public.public_requests for select to authenticated
using (public.has_permission('requests.read'));

create or replace function public.create_public_request(
  request_idempotency_key uuid,
  request_name text,
  request_email text,
  request_phone text,
  request_service text,
  request_priority text,
  request_message text,
  operation_correlation_id uuid,
  request_user_agent text default null
) returns table(
  request_id uuid,
  was_created boolean,
  accepted_at timestamptz,
  accepted_name text,
  accepted_email text,
  accepted_phone text,
  accepted_service text
)
language plpgsql security definer set search_path = '' as $$
declare inserted_id uuid;
declare accepted timestamptz;
begin
  if auth.role() <> 'service_role' then raise exception 'Permission denied'; end if;
  if request_idempotency_key is null or operation_correlation_id is null then raise exception 'Invalid request'; end if;
  if length(btrim(request_name)) not between 1 and 120
    or length(lower(btrim(request_email))) > 254
    or lower(btrim(request_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or (nullif(btrim(request_phone), '') is not null and length(btrim(request_phone)) > 40)
    or request_service not in ('Asesoría académica', 'Servicios legales civiles', 'Redacción profesional', 'Trámites y registros', 'Digital y tecnología', 'Emprendimiento y finanzas')
    or request_priority not in ('Normal', 'Urgente', 'Solo cotización')
    or length(btrim(request_message)) not between 1 and 1200
  then raise exception 'Invalid request'; end if;

  insert into public.public_requests(idempotency_key,name,email,phone,service,priority,message)
  values (
    request_idempotency_key,btrim(request_name),lower(btrim(request_email)),
    nullif(btrim(request_phone),''),request_service,request_priority,btrim(request_message)
  ) on conflict(idempotency_key) do nothing
  returning id,created_at into inserted_id,accepted;

  if inserted_id is not null then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,correlation_id,user_agent,after_data)
    values (null,'public_request_created','public_request',inserted_id,operation_correlation_id,left(request_user_agent,512),
      jsonb_build_object('source','website','service',request_service));
    return query select inserted_id,true,accepted,btrim(request_name),lower(btrim(request_email)),
      nullif(btrim(request_phone),''),request_service;
  else
    return query select r.id,false,r.created_at,r.name,r.email,r.phone,r.service
      from public.public_requests r
      where r.idempotency_key=request_idempotency_key;
  end if;
end;
$$;
revoke all on function public.create_public_request(uuid,text,text,text,text,text,text,uuid,text)
from public,anon,authenticated;
grant execute on function public.create_public_request(uuid,text,text,text,text,text,text,uuid,text)
to service_role;

create or replace function public.claim_public_request_notifications(
  target_request_id uuid,
  operation_correlation_id uuid
) returns table(
  delivery_id uuid,
  channel text,
  recipient_user_id uuid,
  recipient text,
  token_fingerprint text
) language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' or target_request_id is null or operation_correlation_id is null
    then raise exception 'Permission denied'; end if;

  insert into public.public_request_notification_deliveries(
    request_id,channel,recipient_user_id,recipient_key,provider
  )
  select target_request_id,'email',p.id,p.id::text,'resend'
  from public.profiles p
  join public.roles r on r.id=p.role_id and r.is_active
  join auth.users u on u.id=p.id
  where p.status='active' and r.code in ('owner','admin')
    and u.email is not null
    and u.email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= statement_timestamp())
  union all
  select target_request_id,'push',p.id,t.token_fingerprint,'fcm'
  from public.profiles p
  join public.roles r on r.id=p.role_id and r.is_active
  join public.task_push_tokens t on t.user_id=p.id and t.is_active
  where p.status='active' and r.code in ('owner','admin')
  on conflict on constraint public_request_delivery_once do nothing;

  return query
  with claimed as (
    update public.public_request_notification_deliveries d set
      status='processing',attempt_count=d.attempt_count+1,
      correlation_id=operation_correlation_id,last_attempt_at=statement_timestamp()
    where d.request_id=target_request_id and d.status='pending'
    returning d.*
  )
  select c.id,c.channel,c.recipient_user_id,
    case when c.channel='email' then u.email::text else t.token end,
    case when c.channel='push' then t.token_fingerprint end
  from claimed c
  left join auth.users u on c.channel='email' and u.id=c.recipient_user_id
  left join public.task_push_tokens t on c.channel='push'
    and t.token_fingerprint=c.recipient_key and t.is_active
  where (c.channel='email' and u.email is not null)
     or (c.channel='push' and t.token is not null);
end;
$$;
revoke all on function public.claim_public_request_notifications(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.claim_public_request_notifications(uuid,uuid)
to service_role;

create or replace function public.record_public_request_notification(
  target_delivery_id uuid,
  delivery_status text,
  message_id text default null,
  failure_code text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare delivery_record record;
declare audit_action text;
begin
  if auth.role()<>'service_role' or delivery_status not in ('sent','failed')
    then raise exception 'Permission denied'; end if;
  update public.public_request_notification_deliveries set
    status=delivery_status,
    provider_message_id=left(message_id,240),
    error_code=left(failure_code,120),
    sent_at=case when delivery_status='sent' then statement_timestamp() end
  where id=target_delivery_id and status='processing'
  returning request_id,channel,recipient_user_id,correlation_id into delivery_record;
  if delivery_record is null then return; end if;
  audit_action := case
    when delivery_record.channel='email' and delivery_status='sent' then 'admin_email_notification_sent'
    when delivery_record.channel='email' then 'admin_email_notification_failed'
    when delivery_status='sent' then 'admin_push_notification_sent'
    else 'admin_push_notification_failed' end;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,correlation_id,after_data)
  values (null,audit_action,'public_request',delivery_record.request_id,delivery_record.correlation_id,
    jsonb_build_object('channel',delivery_record.channel,'recipient_user_id',delivery_record.recipient_user_id,
      'failure_code',case when delivery_status='failed' then left(failure_code,120) end));
end;
$$;
revoke all on function public.record_public_request_notification(uuid,text,text,text)
from public,anon,authenticated;
grant execute on function public.record_public_request_notification(uuid,text,text,text)
to service_role;

create or replace function public.record_public_request_dispatch_failure(
  target_request_id uuid,
  operation_correlation_id uuid,
  failure_code text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role()<>'service_role' then raise exception 'Permission denied'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,correlation_id,after_data)
  select null,action_name,'public_request',target_request_id,operation_correlation_id,
    jsonb_build_object('failure_code',left(failure_code,120))
  from unnest(array['admin_email_notification_failed','admin_push_notification_failed']) action_name;
end;
$$;
revoke all on function public.record_public_request_dispatch_failure(uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.record_public_request_dispatch_failure(uuid,uuid,text)
to service_role;
