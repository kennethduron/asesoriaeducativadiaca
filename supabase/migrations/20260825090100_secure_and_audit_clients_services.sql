create or replace function public.derive_business_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    if session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Authentication required';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := actor;
  end if;
  new.updated_by := actor;
  return new;
end;
$$;

revoke all on function public.derive_business_actor() from public, anon, authenticated;

create trigger clients_derive_actor before insert or update on public.clients
for each row execute function public.derive_business_actor();
create trigger service_catalog_derive_actor before insert or update on public.service_catalog
for each row execute function public.derive_business_actor();
create trigger client_services_derive_actor before insert or update on public.client_services
for each row execute function public.derive_business_actor();

create or replace function public.derive_note_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    if session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Authentication required';
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then new.created_by := actor; end if;
  return new;
end;
$$;

revoke all on function public.derive_note_actor() from public, anon, authenticated;
create trigger client_notes_derive_actor before insert or update on public.client_notes
for each row execute function public.derive_note_actor();

create or replace function public.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_action text;
  status_action text;
  related_id uuid;
begin
  base_action := case tg_table_name
    when 'clients' then 'client'
    when 'client_notes' then 'client.note'
    when 'service_categories' then 'service_category'
    when 'service_catalog' then 'service'
    when 'client_services' then 'client_service'
  end;

  related_id := case
    when tg_table_name in ('client_notes', 'client_services') then
      coalesce(to_jsonb(new) ->> 'client_id', to_jsonb(old) ->> 'client_id')::uuid
    else coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id')::uuid
  end;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
    values (auth.uid(), base_action || '.created', tg_table_name, related_id, to_jsonb(new));
    return new;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), base_action || '.updated', tg_table_name, related_id, to_jsonb(old), to_jsonb(new));

  if tg_table_name in ('clients', 'client_services')
     and (to_jsonb(new) ->> 'status') is distinct from (to_jsonb(old) ->> 'status') then
    status_action := base_action || '.status_changed';
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
    values (
      auth.uid(), status_action, tg_table_name, related_id,
      jsonb_build_object('status', to_jsonb(old) ->> 'status'),
      jsonb_build_object('status', to_jsonb(new) ->> 'status')
    );
  elsif tg_table_name in ('service_categories', 'service_catalog')
        and (to_jsonb(new) ->> 'is_active') is distinct from (to_jsonb(old) ->> 'is_active') then
    status_action := base_action || '.status_changed';
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
    values (
      auth.uid(), status_action, tg_table_name, related_id,
      jsonb_build_object('is_active', (to_jsonb(old) ->> 'is_active')::boolean),
      jsonb_build_object('is_active', (to_jsonb(new) ->> 'is_active')::boolean)
    );
  end if;

  return new;
end;
$$;

revoke all on function public.audit_business_change() from public, anon, authenticated;
create trigger clients_audit after insert or update on public.clients
for each row execute function public.audit_business_change();
create trigger client_notes_audit after insert or update on public.client_notes
for each row execute function public.audit_business_change();
create trigger service_categories_audit after insert or update on public.service_categories
for each row execute function public.audit_business_change();
create trigger service_catalog_audit after insert or update on public.service_catalog
for each row execute function public.audit_business_change();
create trigger client_services_audit after insert or update on public.client_services
for each row execute function public.audit_business_change();

alter table public.clients enable row level security;
alter table public.client_notes enable row level security;
alter table public.service_categories enable row level security;
alter table public.service_catalog enable row level security;
alter table public.client_services enable row level security;

revoke all on table public.clients, public.client_notes, public.service_categories, public.service_catalog, public.client_services from public, anon, authenticated, service_role;
grant select, insert, update on table public.clients, public.client_notes to authenticated;
grant select, insert, update on table public.service_categories, public.service_catalog, public.client_services to authenticated;

create policy clients_select on public.clients for select to authenticated using (public.has_permission('clients.read'));
create policy clients_insert on public.clients for insert to authenticated with check (public.has_permission('clients.write'));
create policy clients_update on public.clients for update to authenticated using (public.has_permission('clients.write')) with check (public.has_permission('clients.write'));

create policy client_notes_select on public.client_notes for select to authenticated using (public.has_permission('clients.read'));
create policy client_notes_insert on public.client_notes for insert to authenticated with check (public.has_permission('clients.write'));
create policy client_notes_update on public.client_notes for update to authenticated using (public.has_permission('clients.write')) with check (public.has_permission('clients.write'));

create policy service_categories_select on public.service_categories for select to authenticated using (public.has_permission('services.read'));
create policy service_categories_insert on public.service_categories for insert to authenticated with check (public.has_permission('services.write'));
create policy service_categories_update on public.service_categories for update to authenticated using (public.has_permission('services.write')) with check (public.has_permission('services.write'));

create policy service_catalog_select on public.service_catalog for select to authenticated using (public.has_permission('services.read'));
create policy service_catalog_insert on public.service_catalog for insert to authenticated with check (public.has_permission('services.write'));
create policy service_catalog_update on public.service_catalog for update to authenticated using (public.has_permission('services.write')) with check (public.has_permission('services.write'));

create policy client_services_select on public.client_services for select to authenticated using (public.has_permission('services.read'));
create policy client_services_insert on public.client_services for insert to authenticated with check (public.has_permission('services.write'));
create policy client_services_update on public.client_services for update to authenticated using (public.has_permission('services.write')) with check (public.has_permission('services.write'));

alter table public.clients force row level security;
alter table public.client_notes force row level security;
alter table public.service_categories force row level security;
alter table public.service_catalog force row level security;
alter table public.client_services force row level security;

create or replace function public.search_clients(
  search_query text default null,
  status_filter text default null,
  sort_by text default 'registered_on',
  sort_direction text default 'desc',
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  id uuid,
  client_code text,
  full_name text,
  client_type text,
  email text,
  phone text,
  whatsapp text,
  status text,
  registered_on date,
  active_services_count bigint,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if sort_by not in ('full_name', 'registered_on', 'client_code', 'status')
     or sort_direction not in ('asc', 'desc')
     or page_number < 1
     or page_size not in (20, 50, 100)
     or (status_filter is not null and status_filter not in ('active', 'inactive')) then
    raise exception 'Invalid search parameters';
  end if;

  return query
  select
    c.id, c.client_code, c.full_name, c.client_type, c.email, c.phone, c.whatsapp,
    c.status, c.registered_on,
    count(cs.id) filter (where cs.status = 'active') as active_services_count,
    count(*) over() as total_count
  from public.clients c
  left join public.client_services cs on cs.client_id = c.id
  where (status_filter is null or c.status = status_filter)
    and (
      nullif(btrim(search_query), '') is null
      or c.full_name ilike '%' || btrim(search_query) || '%'
      or c.client_code ilike '%' || btrim(search_query) || '%'
      or c.email ilike '%' || btrim(search_query) || '%'
      or c.phone ilike '%' || btrim(search_query) || '%'
      or c.whatsapp ilike '%' || btrim(search_query) || '%'
    )
  group by c.id
  order by
    case when sort_by = 'full_name' and sort_direction = 'asc' then c.full_name end asc,
    case when sort_by = 'full_name' and sort_direction = 'desc' then c.full_name end desc,
    case when sort_by = 'registered_on' and sort_direction = 'asc' then c.registered_on end asc,
    case when sort_by = 'registered_on' and sort_direction = 'desc' then c.registered_on end desc,
    case when sort_by = 'client_code' and sort_direction = 'asc' then c.client_code end asc,
    case when sort_by = 'client_code' and sort_direction = 'desc' then c.client_code end desc,
    case when sort_by = 'status' and sort_direction = 'asc' then c.status end asc,
    case when sort_by = 'status' and sort_direction = 'desc' then c.status end desc,
    c.id
  limit page_size offset ((page_number - 1) * page_size);
end;
$$;

revoke all on function public.search_clients(text, text, text, text, integer, integer) from public, anon;
grant execute on function public.search_clients(text, text, text, text, integer, integer) to authenticated;

create or replace function public.get_client_activity(target_client_id uuid, result_limit integer default 20)
returns table (id uuid, action text, actor_name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('clients.read') or result_limit not between 1 and 50 then
    raise exception 'Permission denied';
  end if;

  return query
  select a.id, a.action, coalesce(p.full_name, 'Sistema') as actor_name, a.created_at
  from public.audit_logs a
  left join public.profiles p on p.id = a.actor_id
  where a.entity_id = target_client_id
    and a.entity_type in ('clients', 'client_notes', 'client_services')
  order by a.created_at desc
  limit result_limit;
end;
$$;

revoke all on function public.get_client_activity(uuid, integer) from public, anon;
grant execute on function public.get_client_activity(uuid, integer) to authenticated;

create or replace function public.get_client_notes(target_client_id uuid, result_limit integer default 30)
returns table (id uuid, note text, author_name text, created_at timestamptz, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('clients.read') or result_limit not between 1 and 50 then
    raise exception 'Permission denied';
  end if;

  return query
  select n.id, n.note, coalesce(p.full_name, 'Usuario DIACA'), n.created_at, n.updated_at
  from public.client_notes n
  left join public.profiles p on p.id = n.created_by
  where n.client_id = target_client_id
  order by n.created_at desc
  limit result_limit;
end;
$$;

revoke all on function public.get_client_notes(uuid, integer) from public, anon;
grant execute on function public.get_client_notes(uuid, integer) to authenticated;

create or replace function public.find_client_duplicates(
  email_candidate text default null,
  phone_candidate text default null,
  whatsapp_candidate text default null,
  excluded_client_id uuid default null
)
returns table (id uuid, client_code text, full_name text)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.client_code, c.full_name
  from public.clients c
  where (excluded_client_id is null or c.id <> excluded_client_id)
    and (
      (nullif(lower(btrim(email_candidate)), '') is not null and lower(btrim(c.email)) = lower(btrim(email_candidate)))
      or (nullif(btrim(phone_candidate), '') is not null and btrim(c.phone) = btrim(phone_candidate))
      or (nullif(btrim(whatsapp_candidate), '') is not null and btrim(c.whatsapp) = btrim(whatsapp_candidate))
    )
  order by c.created_at desc
  limit 5;
$$;

revoke all on function public.find_client_duplicates(text, text, text, uuid) from public, anon;
grant execute on function public.find_client_duplicates(text, text, text, uuid) to authenticated;
