create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'pending',
  dispatch_status text not null default 'failed',
  attempt_count integer not null default 0,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invited_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_invitations_email_normalized check (
    email = lower(btrim(email)) and length(email) between 3 and 254
  ),
  constraint user_invitations_name_valid check (
    length(btrim(full_name)) between 2 and 120
  ),
  constraint user_invitations_status_valid check (
    status in ('pending', 'accepted', 'revoked')
  ),
  constraint user_invitations_dispatch_valid check (
    dispatch_status in ('processing', 'sent', 'failed')
  ),
  constraint user_invitations_attempt_valid check (attempt_count >= 0),
  constraint user_invitations_provider_id_length check (
    provider_message_id is null or length(provider_message_id) <= 240
  ),
  constraint user_invitations_error_length check (
    last_error_code is null or length(last_error_code) <= 120
  )
);

create index user_invitations_status_idx
on public.user_invitations(status, dispatch_status, updated_at desc);

alter table public.user_invitations enable row level security;
alter table public.user_invitations force row level security;
revoke all on table public.user_invitations from public, anon, authenticated, service_role;
grant select, insert, update on table public.user_invitations to service_role;

create trigger user_invitations_set_updated_at
before update on public.user_invitations
for each row execute function public.set_updated_at();

create or replace function public.claim_user_invitation(
  invite_email text,
  invite_full_name text,
  invite_role_id uuid,
  invite_actor uuid
) returns table(invitation_id uuid, invitation_attempt integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(invite_email));
  target public.user_invitations%rowtype;
  actor_role_code text;
  target_role_code text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Permission denied';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(normalized_email) > 254
     or length(btrim(invite_full_name)) not between 2 and 120 then
    raise exception 'Invalid invitation';
  end if;
  if not exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions permission on permission.id = rp.permission_id
    where p.id = invite_actor
      and p.status = 'active'
      and r.is_active
      and permission.code = 'users.manage'
  ) then
    raise exception 'Invalid invitation actor';
  end if;
  if not exists (
    select 1 from public.roles r
    where r.id = invite_role_id and r.is_active
  ) then
    raise exception 'Invalid invitation role';
  end if;
  select r.code into actor_role_code
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = invite_actor and p.status = 'active';
  select r.code into target_role_code
  from public.roles r where r.id = invite_role_id and r.is_active;
  if target_role_code = 'owner' and actor_role_code <> 'owner' then
    raise exception 'Only an owner can assign the owner role';
  end if;
  insert into public.user_invitations(
    email, full_name, role_id, invited_by
  ) values (
    normalized_email, btrim(invite_full_name), invite_role_id, invite_actor
  ) on conflict(email) do nothing;

  select * into target
  from public.user_invitations i
  where i.email = normalized_email
  for update;

  if target.status in ('accepted', 'revoked') then
    raise exception 'Invitation is not available';
  end if;
  if target.dispatch_status = 'processing'
     and target.updated_at > statement_timestamp() - interval '5 minutes' then
    raise exception 'Invitation is already being processed';
  end if;
  if target.dispatch_status = 'sent'
     and target.invited_at > statement_timestamp() - interval '1 minute' then
    raise exception 'Invitation was sent recently';
  end if;

  update public.user_invitations i
  set full_name = btrim(invite_full_name),
      role_id = invite_role_id,
      status = 'pending',
      dispatch_status = 'processing',
      attempt_count = i.attempt_count + 1,
      invited_by = invite_actor,
      invited_at = statement_timestamp(),
      expires_at = statement_timestamp() + interval '1 hour',
      accepted_at = null,
      provider_message_id = null,
      last_error_code = null
  where i.id = target.id
  returning i.id, i.attempt_count into invitation_id, invitation_attempt;

  insert into public.audit_logs(
    actor_id, action, entity_type, entity_id, after_data
  ) values (
    invite_actor,
    'user.invitation.prepared',
    'user_invitation',
    invitation_id,
    jsonb_build_object('attempt', invitation_attempt)
  );

  return next;
end;
$$;

revoke all on function public.claim_user_invitation(text, text, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.claim_user_invitation(text, text, uuid, uuid)
to service_role;

create or replace function public.attach_user_invitation(
  target_invitation_id uuid,
  target_user_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.user_invitations%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Permission denied';
  end if;

  select * into target
  from public.user_invitations i
  where i.id = target_invitation_id
  for update;

  if target.id is null or target.status <> 'pending'
     or target.dispatch_status <> 'processing' then
    raise exception 'Invitation is not pending';
  end if;
  if target.user_id is not null and target.user_id <> target_user_id then
    raise exception 'Invitation user mismatch';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = target_user_id
      and lower(u.email) = target.email
      and u.email_confirmed_at is null
  ) then
    raise exception 'Invitation auth user mismatch';
  end if;

  update public.profiles
  set full_name = target.full_name,
      role_id = target.role_id,
      status = 'inactive',
      updated_by = target.invited_by
  where id = target_user_id;
  if not found then
    raise exception 'Invitation profile missing';
  end if;

  update public.user_invitations
  set user_id = target_user_id
  where id = target_invitation_id;
end;
$$;

revoke all on function public.attach_user_invitation(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.attach_user_invitation(uuid, uuid)
to service_role;

create or replace function public.record_user_invitation_delivery(
  target_invitation_id uuid,
  delivery_status text,
  message_id text default null,
  failure_code text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.user_invitations%rowtype;
  audit_action text;
begin
  if auth.role() <> 'service_role'
     or delivery_status not in ('sent', 'failed') then
    raise exception 'Permission denied';
  end if;

  update public.user_invitations i
  set dispatch_status = delivery_status,
      provider_message_id = left(message_id, 240),
      last_error_code = left(failure_code, 120)
  where i.id = target_invitation_id
    and i.status = 'pending'
    and i.dispatch_status = 'processing'
  returning i.* into target;
  if target.id is null then
    raise exception 'Invitation delivery is not recordable';
  end if;

  audit_action := case delivery_status
    when 'sent' then 'user.invitation.email_sent'
    else 'user.invitation.email_failed'
  end;
  insert into public.audit_logs(
    actor_id, action, entity_type, entity_id, after_data
  ) values (
    target.invited_by,
    audit_action,
    'user_invitation',
    target.id,
    jsonb_strip_nulls(jsonb_build_object(
      'attempt', target.attempt_count,
      'error_code', target.last_error_code
    ))
  );
end;
$$;

revoke all on function public.record_user_invitation_delivery(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.record_user_invitation_delivery(uuid, text, text, text)
to service_role;

create or replace function public.get_my_user_invitation()
returns table(
  invitation_status text,
  full_name text,
  role_code text,
  role_name text,
  invitation_email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.status, i.full_name, r.code, r.name, i.email
  from public.user_invitations i
  join public.roles r on r.id = i.role_id
  where i.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_user_invitation() from public, anon;
grant execute on function public.get_my_user_invitation() to authenticated;

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

create or replace function public.complete_user_invitation()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.user_invitations%rowtype;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  select i.* into target
  from public.user_invitations i
  join auth.users u on u.id = i.user_id
  where i.user_id = actor
    and i.status = 'pending'
    and i.dispatch_status = 'sent'
    and i.expires_at > statement_timestamp()
    and u.email_confirmed_at is not null
    and u.email_confirmed_at >= i.invited_at
    and length(coalesce(u.encrypted_password, '')) > 0
  for update of i;

  if target.id is null then
    raise exception 'Invitation is not completable';
  end if;

  perform set_config('app.invitation_completion', actor::text, true);
  update public.profiles
  set full_name = target.full_name,
      role_id = target.role_id,
      status = 'active',
      updated_by = actor
  where id = actor and status = 'inactive';
  if not found then
    raise exception 'Invitation profile is not inactive';
  end if;

  update public.user_invitations
  set status = 'accepted', accepted_at = statement_timestamp()
  where id = target.id;

  insert into public.audit_logs(
    actor_id, action, entity_type, entity_id, after_data
  ) values (
    actor,
    'user.invitation.accepted',
    'user_invitation',
    target.id,
    jsonb_build_object('role_id', target.role_id)
  );
end;
$$;

revoke all on function public.complete_user_invitation() from public, anon;
grant execute on function public.complete_user_invitation() to authenticated;
