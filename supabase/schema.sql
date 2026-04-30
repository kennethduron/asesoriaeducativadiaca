create extension if not exists "pgcrypto";

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

alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.tasks enable row level security;
alter table public.payments enable row level security;

create policy "Authenticated users can manage leads" on public.leads
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage clients" on public.clients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage cases" on public.cases
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage tasks" on public.tasks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage payments" on public.payments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
