create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint audit_action_not_blank check (length(btrim(action)) > 0),
  constraint audit_entity_type_not_blank check (length(btrim(entity_type)) > 0),
  constraint audit_user_agent_length check (user_agent is null or length(user_agent) <= 512)
);

create index audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);
create index audit_logs_entity_created_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as pr
    join public.roles as r on r.id = pr.role_id
    join public.role_permissions as rp on rp.role_id = r.id
    join public.permissions as p on p.id = rp.permission_id
    where pr.id = auth.uid()
      and pr.status = 'active'
      and r.is_active
      and p.code = permission_code
  );
$$;

revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

create or replace function public.get_my_principal()
returns table (
  user_id uuid,
  full_name text,
  status text,
  role_code text,
  role_name text,
  permission_codes text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pr.id,
    pr.full_name,
    pr.status,
    r.code,
    r.name,
    case when pr.status = 'active' and r.is_active then
      coalesce(array_agg(p.code order by p.code) filter (where p.code is not null), array[]::text[])
    else array[]::text[] end
  from public.profiles as pr
  join public.roles as r on r.id = pr.role_id
  left join public.role_permissions as rp on rp.role_id = r.id
  left join public.permissions as p on p.id = rp.permission_id
  where pr.id = auth.uid()
  group by pr.id, pr.full_name, pr.status, r.code, r.name, r.is_active;
$$;

revoke all on function public.get_my_principal() from public, anon;
grant execute on function public.get_my_principal() to authenticated;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_role_code text;
  actor_role_code text;
begin
  if auth.role() = 'service_role' then
    new.updated_by := actor;
    return new;
  end if;

  if actor is null then
    raise exception 'Authentication required';
  end if;

  if actor = old.id and not public.has_permission('users.manage') then
    if new.role_id is distinct from old.role_id
       or new.status is distinct from old.status
       or new.created_at is distinct from old.created_at
       or new.created_by is distinct from old.created_by then
      raise exception 'Profile field cannot be changed';
    end if;
  elsif not public.has_permission('users.manage') then
    raise exception 'Permission denied';
  end if;

  if new.role_id is distinct from old.role_id then
    select r.code into target_role_code from public.roles as r where r.id = new.role_id;
    select r.code into actor_role_code
    from public.profiles as pr join public.roles as r on r.id = pr.role_id
    where pr.id = actor and pr.status = 'active';

    if target_role_code = 'owner' and actor_role_code <> 'owner' then
      raise exception 'Only an owner can assign the owner role';
    end if;
  end if;

  if exists (select 1 from public.roles where id = old.role_id and code = 'owner')
     and old.status = 'active'
     and (new.status <> 'active' or new.role_id <> old.role_id)
     and not exists (
       select 1 from public.profiles as other
       join public.roles as r on r.id = other.role_id
       where r.code = 'owner' and other.status = 'active' and other.id <> old.id
     ) then
    raise exception 'The last active owner cannot be removed';
  end if;

  new.updated_by := actor;
  return new;
end;
$$;

revoke all on function public.guard_profile_update() from public, anon, authenticated;

create trigger profiles_guard_update
before update on public.profiles
for each row execute function public.guard_profile_update();

create or replace function public.audit_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role_id is distinct from old.role_id then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
    values (
      auth.uid(), 'user.role_changed', 'profile', new.id,
      jsonb_build_object('role_id', old.role_id),
      jsonb_build_object('role_id', new.role_id)
    );
  end if;

  if new.full_name is distinct from old.full_name or new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
    values (
      auth.uid(), 'profile.updated', 'profile', new.id,
      jsonb_build_object('full_name', old.full_name, 'status', old.status),
      jsonb_build_object('full_name', new.full_name, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.audit_profile_update() from public, anon, authenticated;

create trigger profiles_audit_update
after update on public.profiles
for each row execute function public.audit_profile_update();

create or replace function public.guard_system_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.code in ('owner', 'admin', 'finance', 'staff') then
    if tg_op = 'DELETE' then
      raise exception 'System roles cannot be deleted';
    end if;
    if new.code is distinct from old.code then
      raise exception 'System role codes cannot be changed';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.guard_system_roles() from public, anon, authenticated;

create trigger roles_guard_system_contract
before update or delete on public.roles
for each row execute function public.guard_system_roles();

create or replace function public.audit_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_role_id uuid := coalesce(new.role_id, old.role_id);
  changed_permission_id uuid := coalesce(new.permission_id, old.permission_id);
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), 'role.permission_changed', 'role', changed_role_id,
    case when tg_op = 'DELETE' then jsonb_build_object('permission_id', changed_permission_id) end,
    case when tg_op = 'INSERT' then jsonb_build_object('permission_id', changed_permission_id) end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_role_permission_change() from public, anon, authenticated;

create trigger role_permissions_audit_change
after insert or delete on public.role_permissions
for each row execute function public.audit_role_permission_change();

create or replace function public.record_auth_event(
  event_action text,
  event_correlation_id uuid default null,
  event_ip_address inet default null,
  event_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;
  if event_action not in ('auth.login.success', 'auth.logout') then
    raise exception 'Unsupported auth audit event';
  end if;

  if event_action = 'auth.login.success' then
    update public.profiles
    set last_login_at = statement_timestamp(), updated_by = actor
    where id = actor;
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, correlation_id, ip_address, user_agent
  ) values (
    actor, event_action, 'auth_session', actor, event_correlation_id,
    event_ip_address, left(event_user_agent, 512)
  );
end;
$$;

revoke all on function public.record_auth_event(text, uuid, inet, text) from public, anon;
grant execute on function public.record_auth_event(text, uuid, inet, text) to authenticated;

create or replace function public.bootstrap_initial_owner(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_role_id uuid;
begin
  if exists (
    select 1 from public.profiles as pr
    join public.roles as r on r.id = pr.role_id
    where r.code = 'owner' and pr.status = 'active'
  ) then
    raise exception 'An active owner already exists';
  end if;

  select id into owner_role_id from public.roles where code = 'owner' and is_active;
  if owner_role_id is null then raise exception 'Owner role is not configured'; end if;

  update public.profiles
  set role_id = owner_role_id, status = 'active', updated_by = target_user_id
  where id = target_user_id;

  if not found then raise exception 'Target auth user does not have a profile'; end if;
end;
$$;

revoke all on function public.bootstrap_initial_owner(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_initial_owner(uuid) to service_role;
