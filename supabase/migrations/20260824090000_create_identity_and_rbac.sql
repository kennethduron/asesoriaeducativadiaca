create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_code_not_blank check (length(btrim(code)) > 0),
  constraint roles_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint roles_name_not_blank check (length(btrim(name)) > 0)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint permissions_code_not_blank check (length(btrim(code)) > 0),
  constraint permissions_code_format check (code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  constraint permissions_name_not_blank check (length(btrim(name)) > 0)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  full_name text,
  status text not null default 'inactive',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint profiles_status_valid check (status in ('active', 'inactive')),
  constraint profiles_full_name_valid check (
    full_name is null or (length(btrim(full_name)) between 1 and 120)
  )
);

create index profiles_role_id_idx on public.profiles(role_id);
create index profiles_status_idx on public.profiles(status);
create index role_permissions_role_id_idx on public.role_permissions(role_id);
create index role_permissions_permission_id_idx on public.role_permissions(permission_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger roles_set_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.provision_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_role_id uuid;
  proposed_name text;
begin
  select r.id into default_role_id
  from public.roles as r
  where r.code = 'staff' and r.is_active;

  if default_role_id is null then
    raise exception 'Default staff role is not configured';
  end if;

  proposed_name := nullif(btrim(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120)), '');

  insert into public.profiles (id, role_id, full_name, status)
  values (new.id, default_role_id, proposed_name, 'inactive')
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.provision_profile() from public, anon, authenticated;

create trigger auth_user_provision_profile
after insert on auth.users
for each row execute function public.provision_profile();
