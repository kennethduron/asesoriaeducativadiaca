create sequence public.client_code_seq;

create or replace function public.generate_client_code()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'CLI-' || lpad(nextval('public.client_code_seq')::text, 6, '0');
$$;

revoke all on function public.generate_client_code() from public, anon;
grant execute on function public.generate_client_code() to authenticated;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text not null unique default public.generate_client_code(),
  full_name text not null,
  client_type text not null,
  email text,
  phone text,
  whatsapp text,
  address text,
  city text,
  country text,
  status text not null default 'active',
  registered_on date not null default current_date,
  source_lead_id uuid,
  notes_summary text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_code_format check (client_code ~ '^CLI-[0-9]{6,}$'),
  constraint clients_name_length check (length(btrim(full_name)) between 2 and 160),
  constraint clients_type_valid check (client_type in ('individual', 'business')),
  constraint clients_email_length check (email is null or length(email) <= 254),
  constraint clients_phone_length check (phone is null or length(phone) <= 40),
  constraint clients_whatsapp_length check (whatsapp is null or length(whatsapp) <= 40),
  constraint clients_address_length check (address is null or length(address) <= 300),
  constraint clients_city_length check (city is null or length(city) <= 100),
  constraint clients_country_length check (country is null or length(country) <= 100),
  constraint clients_status_valid check (status in ('active', 'inactive')),
  constraint clients_notes_summary_length check (notes_summary is null or length(notes_summary) <= 1000)
);

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  note text not null,
  visibility text not null default 'internal',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_notes_note_length check (length(btrim(note)) between 1 and 5000),
  constraint client_notes_visibility_valid check (visibility = 'internal')
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_categories_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint service_categories_name_length check (length(btrim(name)) between 2 and 120),
  constraint service_categories_description_length check (description is null or length(description) <= 500),
  constraint service_categories_sort_order_valid check (sort_order between 0 and 10000)
);

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null,
  description text,
  standard_price numeric(14,2),
  currency_code char(3) not null default 'HNL',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_catalog_name_length check (length(btrim(name)) between 2 and 160),
  constraint service_catalog_description_length check (description is null or length(description) <= 1000),
  constraint service_catalog_price_positive check (standard_price is null or standard_price > 0),
  constraint service_catalog_currency_uppercase check (currency_code = upper(currency_code)),
  constraint service_catalog_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint service_catalog_category_name_unique unique (category_id, name)
);

create table public.client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  service_id uuid not null references public.service_catalog(id) on delete restrict,
  custom_description text,
  start_date date not null,
  end_date date,
  agreed_price numeric(14,2),
  currency_code char(3) not null default 'HNL',
  billing_mode text,
  status text not null default 'pending',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_services_description_length check (custom_description is null or length(custom_description) <= 1000),
  constraint client_services_dates_valid check (end_date is null or end_date >= start_date),
  constraint client_services_price_positive check (agreed_price is null or agreed_price > 0),
  constraint client_services_currency_uppercase check (currency_code = upper(currency_code)),
  constraint client_services_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint client_services_billing_mode_valid check (billing_mode is null or billing_mode in ('one_time', 'monthly', 'custom')),
  constraint client_services_status_valid check (status in ('pending', 'active', 'suspended', 'completed', 'cancelled'))
);

create index clients_status_idx on public.clients(status);
create index clients_registered_on_idx on public.clients(registered_on desc);
create index clients_created_at_idx on public.clients(created_at desc);
create index clients_full_name_lower_idx on public.clients(lower(full_name));
create index clients_email_lower_idx on public.clients(lower(email)) where email is not null;
create index clients_phone_idx on public.clients(phone) where phone is not null;
create index clients_whatsapp_idx on public.clients(whatsapp) where whatsapp is not null;
create index client_notes_client_created_idx on public.client_notes(client_id, created_at desc);
create index service_categories_active_sort_idx on public.service_categories(is_active, sort_order, name);
create index service_catalog_category_active_idx on public.service_catalog(category_id, is_active, name);
create index client_services_client_status_idx on public.client_services(client_id, status, start_date desc);
create index client_services_service_idx on public.client_services(service_id);

create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger client_notes_set_updated_at before update on public.client_notes
for each row execute function public.set_updated_at();
create trigger service_categories_set_updated_at before update on public.service_categories
for each row execute function public.set_updated_at();
create trigger service_catalog_set_updated_at before update on public.service_catalog
for each row execute function public.set_updated_at();
create trigger client_services_set_updated_at before update on public.client_services
for each row execute function public.set_updated_at();
