insert into public.permissions (code, name, description)
values
  ('tasks.read', 'Leer tareas', 'Consultar tareas propias, asignadas o administrables.'),
  ('tasks.create', 'Crear tareas', 'Crear tareas administrativas.'),
  ('tasks.update', 'Actualizar tareas', 'Editar tareas visibles.'),
  ('tasks.assign', 'Asignar tareas', 'Asignar tareas a otros usuarios.'),
  ('tasks.complete', 'Completar tareas', 'Completar o reabrir tareas visibles.'),
  ('tasks.manage', 'Administrar tareas', 'Consultar y administrar todas las tareas.')
on conflict (code) do update
set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'owner' and p.code like 'tasks.%'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'tasks.read','tasks.create','tasks.update','tasks.assign','tasks.complete','tasks.manage',
  'bank_reports.generate'
]) where r.code = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'tasks.read','tasks.create','tasks.update','tasks.complete','bank_reports.generate'
]) where r.code = 'finance'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'tasks.read','tasks.create','tasks.update','tasks.complete'
]) where r.code = 'staff'
on conflict do nothing;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client_id uuid references public.clients(id) on delete restrict,
  client_service_id uuid references public.client_services(id) on delete restrict,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  priority text not null default 'normal',
  status text not null default 'pending',
  due_at timestamptz not null,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (length(btrim(title)) between 1 and 160),
  constraint tasks_description_length check (description is null or length(description) <= 4000),
  constraint tasks_priority_valid check (priority in ('low','normal','high','urgent')),
  constraint tasks_status_valid check (status in ('pending','in_progress','completed','cancelled')),
  constraint tasks_completion_consistent check (
    (status = 'completed' and completed_at is not null and completed_by is not null)
    or (status <> 'completed' and completed_at is null and completed_by is null)
  ),
  constraint tasks_cancellation_consistent check (
    (status = 'cancelled' and cancelled_at is not null and cancelled_by is not null)
    or (status <> 'cancelled' and cancelled_at is null and cancelled_by is null)
  )
);

create index tasks_assigned_status_due_idx on public.tasks(assigned_to, status, due_at);
create index tasks_created_status_due_idx on public.tasks(created_by, status, due_at);
create index tasks_client_due_idx on public.tasks(client_id, due_at desc) where client_id is not null;

create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  remind_at timestamptz not null,
  relative_minutes integer,
  channel_push boolean not null default false,
  channel_email boolean not null default false,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  correlation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_reminders_channel_required check (channel_push or channel_email),
  constraint task_reminders_status_valid check (status in ('pending','processing','sent','partially_sent','failed','cancelled')),
  constraint task_reminders_attempts_valid check (attempt_count between 0 and 5),
  constraint task_reminders_relative_valid check (relative_minutes is null or relative_minutes between 0 and 10080),
  constraint task_reminders_unique_schedule unique(task_id, remind_at)
);

create index task_reminders_due_idx on public.task_reminders(status, remind_at)
where status in ('pending','processing','partially_sent');

create table public.task_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.task_reminders(id) on delete cascade,
  channel text not null,
  provider text not null,
  status text not null default 'pending',
  attempt integer not null default 0,
  provider_message_id text,
  error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_delivery_channel_valid check (channel in ('push','email')),
  constraint task_delivery_status_valid check (status in ('pending','processing','sent','failed','cancelled')),
  constraint task_delivery_attempt_valid check (attempt between 0 and 5),
  constraint task_delivery_provider_length check (length(provider) between 1 and 40),
  constraint task_delivery_error_length check (error_code is null or length(error_code) <= 120),
  constraint task_delivery_provider_id_length check (provider_message_id is null or length(provider_message_id) <= 240),
  constraint task_delivery_once_per_channel unique(reminder_id, channel)
);

create table public.task_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_fingerprint text not null,
  token text not null,
  user_agent text,
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_push_token_fingerprint_format check (token_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint task_push_token_length check (length(token) between 20 and 4096),
  constraint task_push_user_agent_length check (user_agent is null or length(user_agent) <= 400),
  constraint task_push_token_unique unique(token_fingerprint)
);

create index task_push_tokens_user_active_idx on public.task_push_tokens(user_id, is_active);

create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
create trigger task_reminders_set_updated_at before update on public.task_reminders
for each row execute function public.set_updated_at();
create trigger task_deliveries_set_updated_at before update on public.task_reminder_deliveries
for each row execute function public.set_updated_at();
create trigger task_push_tokens_set_updated_at before update on public.task_push_tokens
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.task_reminders enable row level security;
alter table public.task_reminder_deliveries enable row level security;
alter table public.task_push_tokens enable row level security;
alter table public.tasks force row level security;
alter table public.task_reminders force row level security;
alter table public.task_reminder_deliveries force row level security;
alter table public.task_push_tokens force row level security;

revoke all on table public.tasks, public.task_reminders, public.task_reminder_deliveries, public.task_push_tokens
from public, anon, authenticated, service_role;
grant select on table public.tasks, public.task_reminders, public.task_reminder_deliveries to authenticated;
grant select, insert, update, delete on table public.task_push_tokens to authenticated;
grant select, update on table public.tasks, public.task_reminders to service_role;
grant select, insert, update on table public.task_reminder_deliveries to service_role;
grant select, update, delete on table public.task_push_tokens to service_role;

create policy tasks_select_visible on public.tasks for select to authenticated
using (
  public.has_permission('tasks.read') and (
    public.has_permission('tasks.manage') or assigned_to = auth.uid() or created_by = auth.uid()
  )
);

create policy reminders_select_visible on public.task_reminders for select to authenticated
using (exists (select 1 from public.tasks t where t.id = task_id));

create policy deliveries_select_visible on public.task_reminder_deliveries for select to authenticated
using (exists (
  select 1 from public.task_reminders r join public.tasks t on t.id = r.task_id
  where r.id = reminder_id
));

create policy task_push_tokens_own_select on public.task_push_tokens for select to authenticated
using (user_id = auth.uid());
create policy task_push_tokens_own_insert on public.task_push_tokens for insert to authenticated
with check (user_id = auth.uid());
create policy task_push_tokens_own_update on public.task_push_tokens for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy task_push_tokens_own_delete on public.task_push_tokens for delete to authenticated
using (user_id = auth.uid());

create or replace function public.task_is_visible(task_row public.tasks)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.has_permission('tasks.read') and (
    public.has_permission('tasks.manage') or task_row.assigned_to = auth.uid() or task_row.created_by = auth.uid()
  );
$$;
revoke all on function public.task_is_visible(public.tasks) from public, anon, authenticated, service_role;

create or replace function public.audit_task_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_action text;
begin
  if tg_op = 'INSERT' then event_action := 'task.created';
  elsif new.status = 'completed' and old.status <> 'completed' then event_action := 'task.completed';
  elsif old.status = 'completed' and new.status <> 'completed' then event_action := 'task.reopened';
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then event_action := 'task.cancelled';
  elsif new.assigned_to is distinct from old.assigned_to then event_action := 'task.assigned';
  else event_action := 'task.updated'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), event_action, 'task', new.id,
    case when tg_op = 'UPDATE' then jsonb_build_object('status',old.status,'assigned_to',old.assigned_to,'due_at',old.due_at,'priority',old.priority) end,
    jsonb_build_object('status',new.status,'assigned_to',new.assigned_to,'due_at',new.due_at,'priority',new.priority,'client_id',new.client_id)
  );
  return new;
end;
$$;
revoke all on function public.audit_task_row() from public, anon, authenticated, service_role;
create trigger tasks_audit after insert or update on public.tasks
for each row execute function public.audit_task_row();

create or replace function public.create_task(
  task_title text,
  task_description text,
  task_client_id uuid,
  task_client_service_id uuid,
  task_assigned_to uuid,
  task_priority text,
  task_due_at timestamptz,
  reminder_specs jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); new_task_id uuid; spec jsonb; reminder_at timestamptz;
begin
  if actor is null or not public.has_permission('tasks.create') then raise exception 'Permission denied'; end if;
  if task_assigned_to <> actor and not public.has_permission('tasks.assign') then raise exception 'Permission denied'; end if;
  if task_priority not in ('low','normal','high','urgent') or task_due_at is null then raise exception 'Invalid task'; end if;
  if task_client_service_id is not null and not exists (
    select 1 from public.client_services cs where cs.id = task_client_service_id and cs.client_id = task_client_id
  ) then raise exception 'Invalid client service'; end if;
  if not exists (select 1 from public.profiles p where p.id = task_assigned_to and p.status = 'active') then raise exception 'Invalid assignee'; end if;
  insert into public.tasks(title,description,client_id,client_service_id,assigned_to,created_by,priority,due_at)
  values (btrim(task_title),nullif(btrim(task_description),''),task_client_id,task_client_service_id,task_assigned_to,actor,task_priority,task_due_at)
  returning id into new_task_id;
  if jsonb_typeof(reminder_specs) <> 'array' or jsonb_array_length(reminder_specs) > 8 then raise exception 'Invalid reminders'; end if;
  for spec in select value from jsonb_array_elements(reminder_specs) loop
    if spec ? 'relative_minutes' and spec->>'relative_minutes' is not null then
      if (spec->>'relative_minutes')::integer < 0 or (spec->>'relative_minutes')::integer > 10080 then raise exception 'Invalid reminder'; end if;
      reminder_at := task_due_at - make_interval(mins => (spec->>'relative_minutes')::integer);
    elsif spec ? 'remind_at' and spec->>'remind_at' is not null then
      reminder_at := (spec->>'remind_at')::timestamptz;
    else
      raise exception 'Invalid reminder';
    end if;
    if reminder_at > task_due_at or (not coalesce((spec->>'push')::boolean,false) and not coalesce((spec->>'email')::boolean,false)) then raise exception 'Invalid reminder'; end if;
    insert into public.task_reminders(task_id,remind_at,relative_minutes,channel_push,channel_email)
    values(new_task_id,reminder_at,case when spec->>'relative_minutes' is null then null else (spec->>'relative_minutes')::integer end,coalesce((spec->>'push')::boolean,false),coalesce((spec->>'email')::boolean,false))
    on conflict on constraint task_reminders_unique_schedule do update
      set channel_push=excluded.channel_push, channel_email=excluded.channel_email;
  end loop;
  return new_task_id;
end;
$$;
revoke all on function public.create_task(text,text,uuid,uuid,uuid,text,timestamptz,jsonb) from public, anon, service_role;
grant execute on function public.create_task(text,text,uuid,uuid,uuid,text,timestamptz,jsonb) to authenticated;

create or replace function public.update_task(
  target_task_id uuid,
  task_title text,
  task_description text,
  task_client_id uuid,
  task_client_service_id uuid,
  task_assigned_to uuid,
  task_priority text,
  task_due_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare current_task public.tasks; previous_due timestamptz;
begin
  select * into current_task from public.tasks where id = target_task_id for update;
  if current_task.id is null or not public.task_is_visible(current_task) or not public.has_permission('tasks.update') then raise exception 'Permission denied'; end if;
  if task_assigned_to <> current_task.assigned_to and not public.has_permission('tasks.assign') then raise exception 'Permission denied'; end if;
  if current_task.status in ('completed','cancelled') then raise exception 'Closed task cannot be edited'; end if;
  if task_priority not in ('low','normal','high','urgent') or task_due_at is null then raise exception 'Invalid task'; end if;
  if not exists (select 1 from public.profiles p where p.id=task_assigned_to and p.status='active') then raise exception 'Invalid assignee'; end if;
  if task_client_service_id is not null and not exists (
    select 1 from public.client_services cs where cs.id = task_client_service_id and cs.client_id = task_client_id
  ) then raise exception 'Invalid client service'; end if;
  previous_due := current_task.due_at;
  update public.tasks set title=btrim(task_title), description=nullif(btrim(task_description),''), client_id=task_client_id,
    client_service_id=task_client_service_id, assigned_to=task_assigned_to, priority=task_priority, due_at=task_due_at
  where id=target_task_id;
  if task_due_at is distinct from previous_due then
    update public.task_reminders set remind_at=task_due_at-make_interval(mins=>relative_minutes), status='pending', attempt_count=0,
      last_attempt_at=null, correlation_id=null
    where task_id=target_task_id and relative_minutes is not null and status in ('pending','processing','partially_sent','failed');
  end if;
end;
$$;
revoke all on function public.update_task(uuid,text,text,uuid,uuid,uuid,text,timestamptz) from public, anon, service_role;
grant execute on function public.update_task(uuid,text,text,uuid,uuid,uuid,text,timestamptz) to authenticated;

create or replace function public.set_task_status(target_task_id uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_task public.tasks;
begin
  select * into current_task from public.tasks where id=target_task_id for update;
  if current_task.id is null or not public.task_is_visible(current_task) or not public.has_permission('tasks.complete') then raise exception 'Permission denied'; end if;
  if new_status not in ('pending','in_progress','completed','cancelled') then raise exception 'Invalid status'; end if;
  update public.tasks set status=new_status,
    completed_at=case when new_status='completed' then statement_timestamp() end,
    completed_by=case when new_status='completed' then actor end,
    cancelled_at=case when new_status='cancelled' then statement_timestamp() end,
    cancelled_by=case when new_status='cancelled' then actor end
  where id=target_task_id;
  if new_status in ('completed','cancelled') then
    update public.task_reminders set status='cancelled'
    where task_id=target_task_id and status in ('pending','processing','partially_sent','failed');
    update public.task_reminder_deliveries set status='cancelled'
    where reminder_id in (select id from public.task_reminders where task_id=target_task_id) and status in ('pending','processing','failed');
  elsif current_task.status in ('completed','cancelled') then
    update public.task_reminders set status='pending', attempt_count=0, last_attempt_at=null, correlation_id=null
    where task_id=target_task_id and status='cancelled' and remind_at > statement_timestamp();
  end if;
end;
$$;
revoke all on function public.set_task_status(uuid,text) from public, anon, service_role;
grant execute on function public.set_task_status(uuid,text) to authenticated;

create or replace function public.register_task_push_token(token_value text, token_hash text, agent text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); token_id uuid;
begin
  if actor is null or length(token_value) not between 20 and 4096 or token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid token'; end if;
  if encode(extensions.digest(token_value,'sha256'),'hex') <> token_hash then raise exception 'Invalid token'; end if;
  if not exists(select 1 from public.task_push_tokens where token_fingerprint=token_hash)
    and (select count(*) from public.task_push_tokens where user_id=actor and is_active) >= 10
  then raise exception 'Device limit reached'; end if;
  insert into public.task_push_tokens(user_id,token_fingerprint,token,user_agent,is_active)
  values(actor,token_hash,token_value,left(agent,400),true)
  on conflict(token_fingerprint) do update set
    user_id=actor,token=excluded.token,user_agent=excluded.user_agent,is_active=true,updated_at=now()
  returning id into token_id;
  return token_id;
end;
$$;
revoke all on function public.register_task_push_token(text,text,text) from public, anon, service_role;
grant execute on function public.register_task_push_token(text,text,text) to authenticated;

create or replace function public.search_tasks(
  scope_filter text default 'mine',
  status_filter text default null,
  search_query text default null,
  client_filter uuid default null,
  page_number integer default 1,
  page_size integer default 20
) returns table(
  id uuid, title text, description text, client_id uuid, client_name text,
  assigned_to uuid, assigned_name text, created_by uuid, priority text, status text,
  due_at timestamptz, is_overdue boolean, reminder_count bigint, total_count bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('tasks.read') then raise exception 'Permission denied'; end if;
  if scope_filter not in ('mine','all','today','upcoming','overdue','completed')
    or (scope_filter='all' and not public.has_permission('tasks.manage'))
    or (status_filter is not null and status_filter not in ('pending','in_progress','completed','cancelled'))
    or length(coalesce(search_query,''))>160 or page_number<1 or page_size not in (20,50,100) then raise exception 'Invalid filters'; end if;
  return query
  with filtered as (
    select t.id,t.title,t.description,t.client_id,c.full_name client_name,t.assigned_to,
      coalesce(p.full_name,u.email,'Usuario DIACA') assigned_name,t.created_by,t.priority,t.status,t.due_at,
      (t.status in ('pending','in_progress') and t.due_at<statement_timestamp()) is_overdue,
      count(r.id) reminder_count
    from public.tasks t
    join public.profiles p on p.id=t.assigned_to join auth.users u on u.id=t.assigned_to
    left join public.clients c on c.id=t.client_id left join public.task_reminders r on r.task_id=t.id
    where (public.has_permission('tasks.manage') or t.assigned_to=auth.uid() or t.created_by=auth.uid())
      and (status_filter is null or t.status=status_filter)
      and (client_filter is null or t.client_id=client_filter)
      and (nullif(btrim(search_query),'') is null or t.title ilike '%'||btrim(search_query)||'%' or c.full_name ilike '%'||btrim(search_query)||'%')
      and case scope_filter
        when 'mine' then t.assigned_to=auth.uid() or t.created_by=auth.uid()
        when 'all' then true
        when 'today' then (t.due_at at time zone 'America/Tegucigalpa')::date=(statement_timestamp() at time zone 'America/Tegucigalpa')::date and t.status in ('pending','in_progress')
        when 'upcoming' then (t.due_at at time zone 'America/Tegucigalpa')::date>(statement_timestamp() at time zone 'America/Tegucigalpa')::date and t.status in ('pending','in_progress')
        when 'overdue' then t.due_at<statement_timestamp() and t.status in ('pending','in_progress')
        when 'completed' then t.status='completed'
      end
    group by t.id,c.full_name,p.full_name,u.email
  )
  select f.*,count(*) over() from filtered f
  order by f.is_overdue desc,
    case f.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
    f.due_at,f.id limit page_size offset (page_number-1)*page_size;
end;
$$;
revoke all on function public.search_tasks(text,text,text,uuid,integer,integer) from public,anon,service_role;
grant execute on function public.search_tasks(text,text,text,uuid,integer,integer) to authenticated;

create or replace function public.get_task_detail(target_task_id uuid)
returns table(
  id uuid,title text,description text,client_id uuid,client_name text,client_service_id uuid,
  service_name text,assigned_to uuid,assigned_name text,created_by uuid,priority text,status text,
  due_at timestamptz,completed_at timestamptz,cancelled_at timestamptz,created_at timestamptz,updated_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select t.id,t.title,t.description,t.client_id,c.full_name,t.client_service_id,sc.name,t.assigned_to,
    coalesce(p.full_name,u.email,'Usuario DIACA'),t.created_by,t.priority,t.status,t.due_at,
    t.completed_at,t.cancelled_at,t.created_at,t.updated_at
  from public.tasks t join public.profiles p on p.id=t.assigned_to join auth.users u on u.id=t.assigned_to
  left join public.clients c on c.id=t.client_id
  left join public.client_services cs on cs.id=t.client_service_id
  left join public.service_catalog sc on sc.id=cs.service_id
  where t.id=target_task_id and public.task_is_visible(t);
$$;
revoke all on function public.get_task_detail(uuid) from public,anon,service_role;
grant execute on function public.get_task_detail(uuid) to authenticated;

create or replace function public.get_task_assignees()
returns table(id uuid,full_name text,role_name text) language sql stable security definer set search_path = '' as $$
  select p.id,coalesce(p.full_name,u.email,'Usuario DIACA'),r.name
  from public.profiles p join public.roles r on r.id=p.role_id join auth.users u on u.id=p.id
  where p.status='active' and (
    public.has_permission('tasks.assign') or p.id=auth.uid()
  ) order by lower(coalesce(p.full_name,u.email)),p.id;
$$;
revoke all on function public.get_task_assignees() from public,anon,service_role;
grant execute on function public.get_task_assignees() to authenticated;
