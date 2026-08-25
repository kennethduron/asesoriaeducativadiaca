create or replace function public.can_access_report(
  report_kind text,
  needs_export boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.has_permission('reports.read')
    and (not needs_export or public.has_permission('reports.export'))
    and case report_kind
      when 'clients' then public.has_permission('clients.read')
      when 'services' then public.has_permission('services.read')
      when 'charges' then public.has_permission('charges.read')
      when 'payments' then public.has_permission('payments.read')
      when 'receivables' then public.has_permission('charges.read')
        and public.has_permission('payments.read')
      when 'aging' then public.has_permission('charges.read')
        and public.has_permission('payments.read')
      else false
    end;
$$;

revoke all on function public.can_access_report(text, boolean)
from public, anon, authenticated, service_role;

create or replace function public.get_report_data(
  report_kind text,
  date_from date default null,
  date_to date default null,
  currency_filter text default null,
  status_filter text default null,
  search_query text default null,
  client_filter uuid default null,
  category_filter uuid default null,
  service_filter uuid default null,
  method_filter uuid default null,
  aging_filter text default null,
  sort_by text default 'date',
  sort_direction text default 'desc',
  page_number integer default 1,
  page_size integer default 20,
  export_request boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  row_offset integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if report_kind not in ('clients', 'services', 'charges', 'payments', 'receivables', 'aging')
     or not public.can_access_report(report_kind, export_request) then
    raise exception 'Permission denied';
  end if;
  if page_number < 1
     or (not export_request and page_size not in (20, 50, 100))
     or (export_request and (page_size < 1 or page_size > 5000 or page_number <> 1))
     or length(coalesce(search_query, '')) > 160
     or (currency_filter is not null and currency_filter !~ '^[A-Z]{3}$')
     or (date_from is not null and date_to is not null and date_from > date_to)
     or (date_from is not null and date_to is not null and date_to - date_from > 730)
     or sort_direction not in ('asc', 'desc') then
    raise exception 'Invalid report parameters';
  end if;
  row_offset := (page_number - 1) * page_size;

  if report_kind = 'clients' then
    if (status_filter is not null and status_filter not in ('active', 'inactive'))
       or sort_by not in ('client', 'date', 'status', 'services') then
      raise exception 'Invalid report parameters';
    end if;

    with filtered as (
      select
        c.id,
        c.client_code,
        c.full_name as client_name,
        coalesce(c.email, c.phone, c.whatsapp) as contact,
        c.status,
        c.registered_on,
        count(cs.id) filter (where cs.status = 'active')::integer as active_services
      from public.clients c
      left join public.client_services cs on cs.client_id = c.id
      left join public.service_catalog sc on sc.id = cs.service_id
      where (date_from is null or c.registered_on >= date_from)
        and (date_to is null or c.registered_on <= date_to)
        and (status_filter is null or c.status = status_filter)
        and (service_filter is null or cs.service_id = service_filter)
        and (category_filter is null or sc.category_id = category_filter)
        and (
          nullif(btrim(search_query), '') is null
          or c.full_name ilike '%' || btrim(search_query) || '%'
          or c.client_code ilike '%' || btrim(search_query) || '%'
          or c.email ilike '%' || btrim(search_query) || '%'
        )
      group by c.id
    ), ordered as (
      select f.*, row_number() over (order by
        case when sort_by = 'client' and sort_direction = 'asc' then lower(f.client_name) end asc,
        case when sort_by = 'client' and sort_direction = 'desc' then lower(f.client_name) end desc,
        case when sort_by = 'date' and sort_direction = 'asc' then f.registered_on end asc,
        case when sort_by = 'date' and sort_direction = 'desc' then f.registered_on end desc,
        case when sort_by = 'status' and sort_direction = 'asc' then f.status end asc,
        case when sort_by = 'status' and sort_direction = 'desc' then f.status end desc,
        case when sort_by = 'services' and sort_direction = 'asc' then f.active_services end asc,
        case when sort_by = 'services' and sort_direction = 'desc' then f.active_services end desc,
        f.id
      ) as ordinal
      from filtered f
    ), paged as (
      select * from ordered order by ordinal limit page_size offset row_offset
    )
    select jsonb_build_object(
      'type', report_kind,
      'total_count', (select count(*) from filtered),
      'summary', jsonb_build_object(
        'active', (select count(*) from filtered where status = 'active'),
        'inactive', (select count(*) from filtered where status = 'inactive')
      ),
      'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'ordinal' order by p.ordinal) from paged p), '[]'::jsonb)
    ) into result;

  elsif report_kind = 'services' then
    if (status_filter is not null and status_filter not in ('pending', 'active', 'suspended', 'completed', 'cancelled'))
       or sort_by not in ('client', 'service', 'category', 'date', 'status') then
      raise exception 'Invalid report parameters';
    end if;

    with filtered as (
      select
        cs.id,
        cs.client_id,
        c.client_code,
        c.full_name as client_name,
        sc.id as service_id,
        sc.name as service_name,
        cat.id as category_id,
        cat.name as category_name,
        cs.status,
        cs.start_date,
        cs.end_date,
        cs.billing_mode
      from public.client_services cs
      join public.clients c on c.id = cs.client_id
      join public.service_catalog sc on sc.id = cs.service_id
      join public.service_categories cat on cat.id = sc.category_id
      where (date_from is null or cs.start_date >= date_from)
        and (date_to is null or cs.start_date <= date_to)
        and (status_filter is null or cs.status = status_filter)
        and (client_filter is null or cs.client_id = client_filter)
        and (service_filter is null or cs.service_id = service_filter)
        and (category_filter is null or cat.id = category_filter)
        and (
          nullif(btrim(search_query), '') is null
          or c.full_name ilike '%' || btrim(search_query) || '%'
          or c.client_code ilike '%' || btrim(search_query) || '%'
          or sc.name ilike '%' || btrim(search_query) || '%'
          or cat.name ilike '%' || btrim(search_query) || '%'
        )
    ), ordered as (
      select f.*, row_number() over (order by
        case when sort_by = 'client' and sort_direction = 'asc' then lower(f.client_name) end asc,
        case when sort_by = 'client' and sort_direction = 'desc' then lower(f.client_name) end desc,
        case when sort_by = 'service' and sort_direction = 'asc' then lower(f.service_name) end asc,
        case when sort_by = 'service' and sort_direction = 'desc' then lower(f.service_name) end desc,
        case when sort_by = 'category' and sort_direction = 'asc' then lower(f.category_name) end asc,
        case when sort_by = 'category' and sort_direction = 'desc' then lower(f.category_name) end desc,
        case when sort_by = 'date' and sort_direction = 'asc' then f.start_date end asc,
        case when sort_by = 'date' and sort_direction = 'desc' then f.start_date end desc,
        case when sort_by = 'status' and sort_direction = 'asc' then f.status end asc,
        case when sort_by = 'status' and sort_direction = 'desc' then f.status end desc,
        f.id
      ) as ordinal
      from filtered f
    ), paged as (
      select * from ordered order by ordinal limit page_size offset row_offset
    )
    select jsonb_build_object(
      'type', report_kind,
      'total_count', (select count(*) from filtered),
      'summary', jsonb_build_object(
        'active', (select count(*) from filtered where status = 'active'),
        'pending', (select count(*) from filtered where status = 'pending'),
        'completed', (select count(*) from filtered where status = 'completed')
      ),
      'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'ordinal' order by p.ordinal) from paged p), '[]'::jsonb)
    ) into result;

  elsif report_kind = 'charges' then
    if (status_filter is not null and status_filter not in ('pending', 'partial', 'paid', 'cancelled'))
       or sort_by not in ('date', 'client', 'amount', 'balance', 'due') then
      raise exception 'Invalid report parameters';
    end if;

    with filtered as (
      select
        cb.charge_id as id,
        cb.client_id,
        c.client_code,
        c.full_name as client_name,
        cb.concept,
        sc.name as service_name,
        cb.charge_date,
        cb.due_date,
        cb.original_amount,
        cb.allocated_amount as applied_amount,
        cb.remaining_amount,
        cb.currency_code::text as currency_code,
        cb.derived_status as status
      from public.charge_balances cb
      join public.clients c on c.id = cb.client_id
      left join public.client_services cs on cs.id = cb.client_service_id
      left join public.service_catalog sc on sc.id = cs.service_id
      where (date_from is null or cb.charge_date >= date_from)
        and (date_to is null or cb.charge_date <= date_to)
        and (currency_filter is null or cb.currency_code = currency_filter)
        and (status_filter is null or cb.derived_status = status_filter)
        and (client_filter is null or cb.client_id = client_filter)
        and (service_filter is null or cs.service_id = service_filter)
        and (
          nullif(btrim(search_query), '') is null
          or c.full_name ilike '%' || btrim(search_query) || '%'
          or c.client_code ilike '%' || btrim(search_query) || '%'
          or cb.concept ilike '%' || btrim(search_query) || '%'
        )
    ), ordered as (
      select f.*, row_number() over (order by
        case when sort_by = 'date' and sort_direction = 'asc' then f.charge_date end asc,
        case when sort_by = 'date' and sort_direction = 'desc' then f.charge_date end desc,
        case when sort_by = 'client' and sort_direction = 'asc' then lower(f.client_name) end asc,
        case when sort_by = 'client' and sort_direction = 'desc' then lower(f.client_name) end desc,
        case when sort_by = 'amount' and sort_direction = 'asc' then f.original_amount end asc,
        case when sort_by = 'amount' and sort_direction = 'desc' then f.original_amount end desc,
        case when sort_by = 'balance' and sort_direction = 'asc' then f.remaining_amount end asc,
        case when sort_by = 'balance' and sort_direction = 'desc' then f.remaining_amount end desc,
        case when sort_by = 'due' and sort_direction = 'asc' then f.due_date end asc nulls last,
        case when sort_by = 'due' and sort_direction = 'desc' then f.due_date end desc nulls last,
        f.id
      ) as ordinal
      from filtered f
    ), paged as (
      select * from ordered order by ordinal limit page_size offset row_offset
    ), currency_summary as (
      select f.currency_code,
        sum(f.original_amount)::numeric(14,2) as billed,
        sum(f.applied_amount)::numeric(14,2) as applied,
        sum(f.remaining_amount)::numeric(14,2) as outstanding
      from filtered f group by f.currency_code
    )
    select jsonb_build_object(
      'type', report_kind,
      'total_count', (select count(*) from filtered),
      'summary', coalesce((select jsonb_agg(to_jsonb(s) order by s.currency_code) from currency_summary s), '[]'::jsonb),
      'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'ordinal' order by p.ordinal) from paged p), '[]'::jsonb)
    ) into result;

  elsif report_kind = 'payments' then
    if (status_filter is not null and status_filter not in ('draft', 'confirmed', 'voided'))
       or sort_by not in ('date', 'client', 'amount', 'method', 'status') then
      raise exception 'Invalid report parameters';
    end if;

    with filtered as (
      select
        p.id,
        p.client_id,
        c.client_code,
        c.full_name as client_name,
        p.payment_date,
        p.reference_number,
        pm.name as method_name,
        p.amount,
        coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0)::numeric(14,2) as applied_amount,
        case when p.status = 'confirmed'
          then (p.amount - coalesce(sum(pa.amount) filter (where pa.reversed_at is null), 0))::numeric(14,2)
          else 0::numeric(14,2)
        end as unapplied_amount,
        p.currency_code::text as currency_code,
        p.status,
        r.id as receipt_id,
        r.receipt_number
      from public.payments p
      join public.clients c on c.id = p.client_id
      join public.payment_methods pm on pm.id = p.payment_method_id
      left join public.payment_allocations pa on pa.payment_id = p.id
      left join public.receipts r on r.payment_id = p.id
      where (date_from is null or p.payment_date >= date_from)
        and (date_to is null or p.payment_date <= date_to)
        and (currency_filter is null or p.currency_code = currency_filter)
        and (status_filter is null or p.status = status_filter)
        and (client_filter is null or p.client_id = client_filter)
        and (method_filter is null or p.payment_method_id = method_filter)
        and (
          nullif(btrim(search_query), '') is null
          or c.full_name ilike '%' || btrim(search_query) || '%'
          or c.client_code ilike '%' || btrim(search_query) || '%'
          or p.reference_number ilike '%' || btrim(search_query) || '%'
          or r.receipt_number ilike '%' || btrim(search_query) || '%'
        )
      group by p.id, c.client_code, c.full_name, pm.name, r.id
    ), ordered as (
      select f.*, row_number() over (order by
        case when sort_by = 'date' and sort_direction = 'asc' then f.payment_date end asc,
        case when sort_by = 'date' and sort_direction = 'desc' then f.payment_date end desc,
        case when sort_by = 'client' and sort_direction = 'asc' then lower(f.client_name) end asc,
        case when sort_by = 'client' and sort_direction = 'desc' then lower(f.client_name) end desc,
        case when sort_by = 'amount' and sort_direction = 'asc' then f.amount end asc,
        case when sort_by = 'amount' and sort_direction = 'desc' then f.amount end desc,
        case when sort_by = 'method' and sort_direction = 'asc' then lower(f.method_name) end asc,
        case when sort_by = 'method' and sort_direction = 'desc' then lower(f.method_name) end desc,
        case when sort_by = 'status' and sort_direction = 'asc' then f.status end asc,
        case when sort_by = 'status' and sort_direction = 'desc' then f.status end desc,
        f.id
      ) as ordinal
      from filtered f
    ), paged as (
      select * from ordered order by ordinal limit page_size offset row_offset
    ), currency_summary as (
      select f.currency_code,
        sum(f.amount) filter (where f.status = 'confirmed')::numeric(14,2) as confirmed,
        sum(f.applied_amount) filter (where f.status = 'confirmed')::numeric(14,2) as applied,
        sum(f.unapplied_amount) filter (where f.status = 'confirmed')::numeric(14,2) as unapplied,
        count(*) filter (where f.status = 'voided')::integer as voided_count
      from filtered f group by f.currency_code
    )
    select jsonb_build_object(
      'type', report_kind,
      'total_count', (select count(*) from filtered),
      'summary', coalesce((select jsonb_agg(to_jsonb(s) order by s.currency_code) from currency_summary s), '[]'::jsonb),
      'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'ordinal' order by p.ordinal) from paged p), '[]'::jsonb)
    ) into result;

  elsif report_kind = 'receivables' then
    if (status_filter is not null and status_filter not in ('outstanding', 'overdue', 'current'))
       or (aging_filter is not null and aging_filter not in ('current', '1_30', '31_60', '61_90', '90_plus'))
       or sort_by not in ('client', 'outstanding', 'overdue', 'due') then
      raise exception 'Invalid report parameters';
    end if;

    with filtered as (
      select
        s.client_id as id,
        s.client_id,
        s.client_code,
        s.client_name,
        s.currency_code,
        s.outstanding_balance,
        s.overdue_balance,
        s.not_due_balance,
        s.unapplied_credit,
        s.oldest_open_due_date,
        a.current_balance,
        a.balance_1_30,
        a.balance_31_60,
        a.balance_61_90,
        a.balance_90_plus
      from public.client_account_summary s
      left join public.client_aging_summary a
        on a.client_id = s.client_id and a.currency_code = s.currency_code
      where (currency_filter is null or s.currency_code = currency_filter)
        and (client_filter is null or s.client_id = client_filter)
        and case coalesce(status_filter, 'outstanding')
          when 'outstanding' then s.outstanding_balance > 0
          when 'overdue' then s.overdue_balance > 0
          when 'current' then s.overdue_balance = 0
        end
        and case coalesce(aging_filter, 'all')
          when 'current' then coalesce(a.current_balance, 0) > 0
          when '1_30' then coalesce(a.balance_1_30, 0) > 0
          when '31_60' then coalesce(a.balance_31_60, 0) > 0
          when '61_90' then coalesce(a.balance_61_90, 0) > 0
          when '90_plus' then coalesce(a.balance_90_plus, 0) > 0
          else true
        end
        and (
          nullif(btrim(search_query), '') is null
          or s.client_name ilike '%' || btrim(search_query) || '%'
          or s.client_code ilike '%' || btrim(search_query) || '%'
        )
    ), ordered as (
      select f.*, row_number() over (order by
        case when sort_by = 'client' and sort_direction = 'asc' then lower(f.client_name) end asc,
        case when sort_by = 'client' and sort_direction = 'desc' then lower(f.client_name) end desc,
        case when sort_by = 'outstanding' and sort_direction = 'asc' then f.outstanding_balance end asc,
        case when sort_by = 'outstanding' and sort_direction = 'desc' then f.outstanding_balance end desc,
        case when sort_by = 'overdue' and sort_direction = 'asc' then f.overdue_balance end asc,
        case when sort_by = 'overdue' and sort_direction = 'desc' then f.overdue_balance end desc,
        case when sort_by = 'due' and sort_direction = 'asc' then f.oldest_open_due_date end asc nulls last,
        case when sort_by = 'due' and sort_direction = 'desc' then f.oldest_open_due_date end desc nulls last,
        f.id, f.currency_code
      ) as ordinal
      from filtered f
    ), paged as (
      select * from ordered order by ordinal limit page_size offset row_offset
    ), currency_summary as (
      select f.currency_code,
        sum(f.outstanding_balance)::numeric(14,2) as outstanding,
        sum(f.overdue_balance)::numeric(14,2) as overdue,
        sum(f.not_due_balance)::numeric(14,2) as not_due,
        sum(f.unapplied_credit)::numeric(14,2) as unapplied
      from filtered f group by f.currency_code
    )
    select jsonb_build_object(
      'type', report_kind,
      'total_count', (select count(*) from filtered),
      'summary', coalesce((select jsonb_agg(to_jsonb(s) order by s.currency_code) from currency_summary s), '[]'::jsonb),
      'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'ordinal' order by p.ordinal) from paged p), '[]'::jsonb)
    ) into result;

  else
    if (aging_filter is not null and aging_filter not in ('current', '1_30', '31_60', '61_90', '90_plus'))
       or sort_by not in ('client', 'overdue', '1_30', '31_60', '61_90', '90_plus') then
      raise exception 'Invalid report parameters';
    end if;

    with filtered as (
      select
        a.client_id as id,
        a.client_id,
        a.client_code,
        a.client_name,
        a.currency_code,
        a.current_balance,
        a.balance_1_30,
        a.balance_31_60,
        a.balance_61_90,
        a.balance_90_plus,
        (a.balance_1_30 + a.balance_31_60 + a.balance_61_90 + a.balance_90_plus)::numeric(14,2) as total_overdue
      from public.client_aging_summary a
      where (currency_filter is null or a.currency_code = currency_filter)
        and (client_filter is null or a.client_id = client_filter)
        and case coalesce(aging_filter, 'all')
          when 'current' then a.current_balance > 0
          when '1_30' then a.balance_1_30 > 0
          when '31_60' then a.balance_31_60 > 0
          when '61_90' then a.balance_61_90 > 0
          when '90_plus' then a.balance_90_plus > 0
          else true
        end
        and (
          nullif(btrim(search_query), '') is null
          or a.client_name ilike '%' || btrim(search_query) || '%'
          or a.client_code ilike '%' || btrim(search_query) || '%'
        )
    ), ordered as (
      select f.*, row_number() over (order by
        case when sort_by = 'client' and sort_direction = 'asc' then lower(f.client_name) end asc,
        case when sort_by = 'client' and sort_direction = 'desc' then lower(f.client_name) end desc,
        case when sort_by = 'overdue' and sort_direction = 'asc' then f.total_overdue end asc,
        case when sort_by = 'overdue' and sort_direction = 'desc' then f.total_overdue end desc,
        case when sort_by = '1_30' and sort_direction = 'asc' then f.balance_1_30 end asc,
        case when sort_by = '1_30' and sort_direction = 'desc' then f.balance_1_30 end desc,
        case when sort_by = '31_60' and sort_direction = 'asc' then f.balance_31_60 end asc,
        case when sort_by = '31_60' and sort_direction = 'desc' then f.balance_31_60 end desc,
        case when sort_by = '61_90' and sort_direction = 'asc' then f.balance_61_90 end asc,
        case when sort_by = '61_90' and sort_direction = 'desc' then f.balance_61_90 end desc,
        case when sort_by = '90_plus' and sort_direction = 'asc' then f.balance_90_plus end asc,
        case when sort_by = '90_plus' and sort_direction = 'desc' then f.balance_90_plus end desc,
        f.id, f.currency_code
      ) as ordinal
      from filtered f
    ), paged as (
      select * from ordered order by ordinal limit page_size offset row_offset
    ), currency_summary as (
      select f.currency_code,
        sum(f.current_balance)::numeric(14,2) as current_balance,
        sum(f.balance_1_30)::numeric(14,2) as balance_1_30,
        sum(f.balance_31_60)::numeric(14,2) as balance_31_60,
        sum(f.balance_61_90)::numeric(14,2) as balance_61_90,
        sum(f.balance_90_plus)::numeric(14,2) as balance_90_plus,
        sum(f.total_overdue)::numeric(14,2) as total_overdue
      from filtered f group by f.currency_code
    )
    select jsonb_build_object(
      'type', report_kind,
      'total_count', (select count(*) from filtered),
      'summary', coalesce((select jsonb_agg(to_jsonb(s) order by s.currency_code) from currency_summary s), '[]'::jsonb),
      'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'ordinal' order by p.ordinal) from paged p), '[]'::jsonb)
    ) into result;
  end if;

  return result;
end;
$$;

revoke all on function public.get_report_data(
  text, date, date, text, text, text, uuid, uuid, uuid, uuid, text,
  text, text, integer, integer, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.get_report_data(
  text, date, date, text, text, text, uuid, uuid, uuid, uuid, text,
  text, text, integer, integer, boolean
) to authenticated;

create or replace function public.record_report_exported(
  report_kind text,
  export_format text,
  normalized_filters jsonb,
  exported_row_count integer,
  operation_correlation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  audit_id uuid;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not public.can_access_report(report_kind, true) then
    raise exception 'Permission denied';
  end if;
  if export_format not in ('xlsx', 'pdf')
     or normalized_filters is null
     or jsonb_typeof(normalized_filters) <> 'object'
     or length(normalized_filters::text) > 4000
     or exported_row_count < 0
     or exported_row_count > 5000
     or operation_correlation_id is null then
    raise exception 'Invalid export audit parameters';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, after_data, correlation_id
  ) values (
    actor,
    'report.exported',
    'report',
    jsonb_build_object(
      'report_type', report_kind,
      'format', export_format,
      'filters', normalized_filters,
      'row_count', exported_row_count
    ),
    operation_correlation_id
  ) returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.record_report_exported(text, text, jsonb, integer, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.record_report_exported(text, text, jsonb, integer, uuid)
to authenticated;
