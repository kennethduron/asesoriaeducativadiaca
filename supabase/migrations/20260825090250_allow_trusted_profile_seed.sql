-- Allow the migration/seed owner to activate the synthetic DEV profile
-- without manufacturing JWT claims. API callers remain subject to grants/RLS.
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
