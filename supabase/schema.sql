create extension if not exists "pgcrypto";

create table if not exists public.crm_admins (
  email text primary key,
  username text unique,
  created_at timestamptz not null default now()
);

alter table public.crm_admins add column if not exists username text unique;

create or replace function public.is_diaca_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crm_admins
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.resolve_admin_login(login text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.crm_admins
  where lower(email) = lower(trim(login))
     or lower(username) = lower(trim(login))
  limit 1;
$$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  service text not null,
  status text not null default 'Nuevo',
  priority text not null default 'Normal',
  value numeric(12,2) not null default 0,
  owner text not null default 'Kenneth',
  note text,
  next_follow_up date,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists priority text not null default 'Normal';
alter table public.leads add column if not exists next_follow_up date;
alter table public.leads add column if not exists history jsonb not null default '[]'::jsonb;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  service text not null,
  status text not null default 'Activo',
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  stage text not null default 'Investigacion',
  owner text not null,
  due date,
  progress text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner text not null,
  due date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  amount numeric(12,2) not null,
  method text not null,
  reference text,
  paid_at timestamptz not null default now()
);

alter table public.crm_admins enable row level security;
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.tasks enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Authenticated users can manage leads" on public.leads;
drop policy if exists "Authenticated users can manage clients" on public.clients;
drop policy if exists "Authenticated users can manage cases" on public.cases;
drop policy if exists "Authenticated users can manage tasks" on public.tasks;
drop policy if exists "Authenticated users can manage payments" on public.payments;
drop policy if exists "Admins can read allowed admin emails" on public.crm_admins;
drop policy if exists "DIACA admins can manage leads" on public.leads;
drop policy if exists "DIACA admins can manage clients" on public.clients;
drop policy if exists "DIACA admins can manage cases" on public.cases;
drop policy if exists "DIACA admins can manage tasks" on public.tasks;
drop policy if exists "DIACA admins can manage payments" on public.payments;

create policy "Admins can read allowed admin emails" on public.crm_admins
  for select using (public.is_diaca_admin());

create policy "DIACA admins can manage leads" on public.leads
  for all using (public.is_diaca_admin()) with check (public.is_diaca_admin());

create policy "DIACA admins can manage clients" on public.clients
  for all using (public.is_diaca_admin()) with check (public.is_diaca_admin());

create policy "DIACA admins can manage cases" on public.cases
  for all using (public.is_diaca_admin()) with check (public.is_diaca_admin());

create policy "DIACA admins can manage tasks" on public.tasks
  for all using (public.is_diaca_admin()) with check (public.is_diaca_admin());

create policy "DIACA admins can manage payments" on public.payments
  for all using (public.is_diaca_admin()) with check (public.is_diaca_admin());

-- After creating your Supabase Auth admin user, add its email here in SQL Editor:
-- insert into public.crm_admins (email, username) values ('admin@diaca.hn', 'admin')
-- on conflict (email) do nothing;
