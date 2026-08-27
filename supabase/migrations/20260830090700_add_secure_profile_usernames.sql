alter table public.profiles
add column username text;

with candidates as (
  select
    id,
    lower(btrim(full_name)) as candidate,
    count(*) over (partition by lower(btrim(full_name))) as candidate_count
  from public.profiles
  where btrim(coalesce(full_name, '')) ~ '^[A-Za-z0-9._-]{3,30}$'
)
update public.profiles as profile
set username = candidates.candidate
from candidates
where profile.id = candidates.id
  and candidates.candidate_count = 1;

alter table public.profiles
add constraint profiles_username_valid check (
  username is null
  or (
    username = lower(btrim(username))
    and username ~ '^[a-z0-9._-]{3,30}$'
  )
);

create unique index profiles_username_unique_idx
on public.profiles(username)
where username is not null;

create or replace function public.resolve_username_login(login_identifier text)
returns table(email text)
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = lower(btrim(login_identifier))
  limit 1;
$$;

revoke all on function public.resolve_username_login(text)
from public, anon, authenticated;
grant execute on function public.resolve_username_login(text) to service_role;

create or replace function public.update_my_username(requested_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_username text := lower(btrim(requested_username));
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;
  if normalized_username !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'Invalid username' using errcode = '22023';
  end if;

  perform set_config('app.username_update', actor::text, true);
  update public.profiles
  set username = normalized_username,
      updated_by = actor
  where id = actor;

  if not found then
    raise exception 'Profile not found';
  end if;
  perform set_config('app.username_update', '', true);
  return normalized_username;
exception
  when unique_violation then
    perform set_config('app.username_update', '', true);
    raise exception 'Username unavailable' using errcode = '23505';
end;
$$;

revoke all on function public.update_my_username(text) from public, anon;
grant execute on function public.update_my_username(text) to authenticated;

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
  if actor is null and current_user = 'postgres' then
    return new;
  end if;

  if auth.role() = 'service_role' then
    new.updated_by := actor;
    return new;
  end if;

  if actor is null then
    raise exception 'Authentication required';
  end if;

  if current_user = 'postgres'
     and actor = old.id
     and current_setting('app.username_update', true) = actor::text then
    if new.role_id is distinct from old.role_id
       or new.status is distinct from old.status
       or new.full_name is distinct from old.full_name
       or new.created_at is distinct from old.created_at
       or new.created_by is distinct from old.created_by then
      raise exception 'Invalid username profile update';
    end if;
    new.updated_by := actor;
    return new;
  end if;

  if current_user = 'postgres'
     and actor = old.id
     and current_setting('app.invitation_completion', true) = actor::text then
    if new.status <> 'active'
       or new.role_id is distinct from (
         select i.role_id
         from public.user_invitations i
         where i.user_id = actor
           and i.status = 'pending'
           and i.dispatch_status = 'sent'
       ) then
      raise exception 'Invalid invitation profile update';
    end if;
    new.updated_by := actor;
    return new;
  end if;

  if new.username is distinct from old.username then
    raise exception 'Username must be changed through the secure function';
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
    select r.code into target_role_code
    from public.roles r where r.id = new.role_id;
    select r.code into actor_role_code
    from public.profiles pr
    join public.roles r on r.id = pr.role_id
    where pr.id = actor and pr.status = 'active';

    if target_role_code = 'owner' and actor_role_code <> 'owner' then
      raise exception 'Only an owner can assign the owner role';
    end if;
  end if;

  if exists (
       select 1 from public.roles where id = old.role_id and code = 'owner'
     )
     and old.status = 'active'
     and (new.status <> 'active' or new.role_id <> old.role_id)
     and not exists (
       select 1
       from public.profiles other
       join public.roles r on r.id = other.role_id
       where r.code = 'owner'
         and other.status = 'active'
         and other.id <> old.id
     ) then
    raise exception 'The last active owner cannot be removed';
  end if;

  new.updated_by := actor;
  return new;
end;
$$;

revoke all on function public.guard_profile_update()
from public, anon, authenticated;

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

  if new.username is distinct from old.username then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
    values (
      auth.uid(), 'profile.username_updated', 'profile', new.id,
      jsonb_build_object('username', old.username),
      jsonb_build_object('username', new.username)
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

revoke all on function public.audit_profile_update()
from public, anon, authenticated;

drop function public.get_my_principal();
create function public.get_my_principal()
returns table (
  user_id uuid,
  full_name text,
  username text,
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
    pr.username,
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
  group by pr.id, pr.full_name, pr.username, pr.status, r.code, r.name, r.is_active;
$$;

revoke all on function public.get_my_principal() from public, anon;
grant execute on function public.get_my_principal() to authenticated;
