-- F8 cutover support: Legacy team labels are not user identities. Preserve
-- provenance without assigning a person, while normal UI creation still
-- requires a valid active assignee through create_task().
alter table public.tasks
  alter column assigned_to drop not null,
  add column migration_metadata jsonb;

alter table public.tasks
  add constraint tasks_migration_metadata_object check (
    migration_metadata is null or jsonb_typeof(migration_metadata) = 'object'
  );

create unique index tasks_legacy_source_id_unique
on public.tasks (
  (migration_metadata ->> 'source'),
  (migration_metadata ->> 'legacy_task_id')
)
where migration_metadata ? 'source'
  and migration_metadata ? 'legacy_task_id';

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
      coalesce(p.full_name,u.email,'Sin asignar') assigned_name,t.created_by,t.priority,t.status,t.due_at,
      (t.status in ('pending','in_progress') and t.due_at<statement_timestamp()) is_overdue,
      count(r.id) reminder_count
    from public.tasks t
    left join public.profiles p on p.id=t.assigned_to
    left join auth.users u on u.id=t.assigned_to
    left join public.clients c on c.id=t.client_id
    left join public.task_reminders r on r.task_id=t.id
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

create or replace function public.get_task_detail(target_task_id uuid)
returns table(
  id uuid,title text,description text,client_id uuid,client_name text,client_service_id uuid,
  service_name text,assigned_to uuid,assigned_name text,created_by uuid,priority text,status text,
  due_at timestamptz,completed_at timestamptz,cancelled_at timestamptz,created_at timestamptz,updated_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select t.id,t.title,t.description,t.client_id,c.full_name,t.client_service_id,sc.name,t.assigned_to,
    coalesce(p.full_name,u.email,'Sin asignar'),t.created_by,t.priority,t.status,t.due_at,
    t.completed_at,t.cancelled_at,t.created_at,t.updated_at
  from public.tasks t
  left join public.profiles p on p.id=t.assigned_to
  left join auth.users u on u.id=t.assigned_to
  left join public.clients c on c.id=t.client_id
  left join public.client_services cs on cs.id=t.client_service_id
  left join public.service_catalog sc on sc.id=cs.service_id
  where t.id=target_task_id and public.task_is_visible(t);
$$;

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
  if task_assigned_to is distinct from current_task.assigned_to and not public.has_permission('tasks.assign') then raise exception 'Permission denied'; end if;
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

revoke all on function public.search_tasks(text,text,text,uuid,integer,integer) from public,anon,service_role;
grant execute on function public.search_tasks(text,text,text,uuid,integer,integer) to authenticated;
revoke all on function public.get_task_detail(uuid) from public,anon,service_role;
grant execute on function public.get_task_detail(uuid) to authenticated;
revoke all on function public.update_task(uuid,text,text,uuid,uuid,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function public.update_task(uuid,text,text,uuid,uuid,uuid,text,timestamptz) to authenticated;
