create or replace function public.get_dashboard_summary(
  from_date date,
  to_date date,
  currency_filter text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  effective_from date := from_date;
  effective_to date := to_date;
  period_days integer;
  previous_from date;
  previous_to date;
  can_clients boolean := public.has_permission('clients.read');
  can_services boolean := public.has_permission('services.read');
  can_financial boolean := public.has_permission('reports.read')
    and public.has_permission('charges.read')
    and public.has_permission('payments.read');
  clients_section jsonb := null;
  services_section jsonb := null;
  financial_section jsonb := null;
  activity_section jsonb := '[]'::jsonb;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if effective_from is null or effective_to is null
     or effective_from > effective_to
     or effective_to > (now() at time zone 'America/Tegucigalpa')::date
     or effective_to - effective_from > 730
     or currency_filter is null
     or currency_filter !~ '^[A-Z]{3}$' then
    raise exception 'Invalid dashboard parameters';
  end if;

  if not can_clients and not can_services and not can_financial then
    raise exception 'Permission denied';
  end if;

  period_days := effective_to - effective_from + 1;
  previous_to := effective_from - 1;
  previous_from := effective_from - period_days;

  if can_clients then
    select jsonb_build_object(
      'active', count(*) filter (where c.status = 'active'),
      'new_current', count(*) filter (
        where c.registered_on between effective_from and effective_to
      ),
      'new_previous', count(*) filter (
        where c.registered_on between previous_from and previous_to
      )
    )
    into clients_section
    from public.clients c;
  end if;

  if can_services then
    with category_totals as (
      select
        sca.id,
        sca.name,
        count(*)::integer as service_count
      from public.client_services cs
      join public.service_catalog sc on sc.id = cs.service_id
      join public.service_categories sca on sca.id = sc.category_id
      where cs.status = 'active'
      group by sca.id, sca.name
      order by service_count desc, sca.name
      limit 8
    )
    select jsonb_build_object(
      'active', (
        select count(*) from public.client_services cs where cs.status = 'active'
      ),
      'by_category', coalesce((
        select jsonb_agg(jsonb_build_object(
          'category_id', ct.id,
          'category', ct.name,
          'count', ct.service_count
        ) order by ct.service_count desc, ct.name)
        from category_totals ct
      ), '[]'::jsonb)
    )
    into services_section;
  end if;

  if can_financial then
    with charge_kpis as (
      select
        coalesce(sum(c.amount) filter (
          where c.status <> 'cancelled'
            and c.charge_date between effective_from and effective_to
        ), 0)::numeric(14,2) as current_billed,
        coalesce(sum(c.amount) filter (
          where c.status <> 'cancelled'
            and c.charge_date between previous_from and previous_to
        ), 0)::numeric(14,2) as previous_billed
      from public.charges c
      where c.currency_code = currency_filter
        and c.charge_date between previous_from and effective_to
    ), payment_kpis as (
      select
        coalesce(sum(p.amount) filter (
          where p.status = 'confirmed'
            and p.payment_date between effective_from and effective_to
        ), 0)::numeric(14,2) as current_collected,
        coalesce(sum(p.amount) filter (
          where p.status = 'confirmed'
            and p.payment_date between previous_from and previous_to
        ), 0)::numeric(14,2) as previous_collected
      from public.payments p
      where p.currency_code = currency_filter
        and p.payment_date between previous_from and effective_to
    ), account_kpis as (
      select
        coalesce(sum(s.outstanding_balance), 0)::numeric(14,2) as outstanding,
        coalesce(sum(s.overdue_balance), 0)::numeric(14,2) as overdue,
        coalesce(sum(s.unapplied_credit), 0)::numeric(14,2) as unapplied,
        count(*) filter (where s.overdue_balance > 0)::integer as delinquent_clients
      from public.client_account_summary s
      where s.currency_code = currency_filter
    ), aging_kpis as (
      select
        coalesce(sum(a.current_balance), 0)::numeric(14,2) as current_balance,
        coalesce(sum(a.balance_1_30), 0)::numeric(14,2) as balance_1_30,
        coalesce(sum(a.balance_31_60), 0)::numeric(14,2) as balance_31_60,
        coalesce(sum(a.balance_61_90), 0)::numeric(14,2) as balance_61_90,
        coalesce(sum(a.balance_90_plus), 0)::numeric(14,2) as balance_90_plus
      from public.client_aging_summary a
      where a.currency_code = currency_filter
    ), bucket_dates as (
      select gs::date as bucket_date
      from generate_series(
        effective_from::timestamp,
        effective_to::timestamp,
        interval '1 day'
      ) gs
      where period_days <= 31
      union all
      select gs::date
      from generate_series(
        date_trunc('month', effective_from)::timestamp,
        date_trunc('month', effective_to)::timestamp,
        interval '1 month'
      ) gs
      where period_days > 31
    ), billed_series as (
      select
        case when period_days <= 31
          then c.charge_date
          else date_trunc('month', c.charge_date)::date
        end as bucket_date,
        sum(c.amount)::numeric(14,2) as amount
      from public.charges c
      where c.currency_code = currency_filter
        and c.status <> 'cancelled'
        and c.charge_date between effective_from and effective_to
      group by 1
    ), collected_series as (
      select
        case when period_days <= 31
          then p.payment_date
          else date_trunc('month', p.payment_date)::date
        end as bucket_date,
        sum(p.amount)::numeric(14,2) as amount
      from public.payments p
      where p.currency_code = currency_filter
        and p.status = 'confirmed'
        and p.payment_date between effective_from and effective_to
      group by 1
    ), series as (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', b.bucket_date,
        'billed', coalesce(bs.amount, 0),
        'collected', coalesce(ps.amount, 0)
      ) order by b.bucket_date), '[]'::jsonb) as values
      from bucket_dates b
      left join billed_series bs on bs.bucket_date = b.bucket_date
      left join collected_series ps on ps.bucket_date = b.bucket_date
    ), top_overdue as (
      select coalesce(jsonb_agg(jsonb_build_object(
        'client_id', ranked.client_id,
        'client_code', ranked.client_code,
        'client_name', ranked.client_name,
        'currency_code', ranked.currency_code,
        'overdue_balance', ranked.overdue_balance,
        'oldest_due_date', ranked.oldest_open_due_date,
        'days_overdue', case
          when ranked.oldest_open_due_date is null then 0
          else greatest(current_date - ranked.oldest_open_due_date, 0)
        end
      ) order by ranked.overdue_balance desc, ranked.client_name), '[]'::jsonb) as values
      from (
        select s.*
        from public.client_account_summary s
        where s.currency_code = currency_filter and s.overdue_balance > 0
        order by s.overdue_balance desc, s.client_name
        limit 8
      ) ranked
    )
    select jsonb_build_object(
      'currency', currency_filter,
      'billed', jsonb_build_object(
        'current', ck.current_billed,
        'previous', ck.previous_billed
      ),
      'collected', jsonb_build_object(
        'current', pk.current_collected,
        'previous', pk.previous_collected
      ),
      'outstanding', ak.outstanding,
      'overdue', ak.overdue,
      'unapplied_credit', ak.unapplied,
      'delinquent_clients', ak.delinquent_clients,
      'aging', jsonb_build_object(
        'current', ag.current_balance,
        '1_30', ag.balance_1_30,
        '31_60', ag.balance_31_60,
        '61_90', ag.balance_61_90,
        '90_plus', ag.balance_90_plus
      ),
      'granularity', case when period_days <= 31 then 'day' else 'month' end,
      'series', se.values,
      'top_overdue', top.values
    )
    into financial_section
    from charge_kpis ck
    cross join payment_kpis pk
    cross join account_kpis ak
    cross join aging_kpis ag
    cross join series se
    cross join top_overdue top;
  end if;

  if can_financial then
    select coalesce(jsonb_agg(jsonb_build_object(
      'type', recent.activity_type,
      'label', recent.label,
      'detail', recent.detail,
      'occurred_at', recent.occurred_at,
      'href', recent.href
    ) order by recent.occurred_at desc), '[]'::jsonb)
    into activity_section
    from (
      select * from (
        select
          'client'::text as activity_type,
          c.full_name as label,
          'Cliente creado'::text as detail,
          c.created_at as occurred_at,
          '/admin/clientes/' || c.id::text as href
        from public.clients c
        union all
        select
          'charge', c.full_name,
          'Cargo: ' || ch.concept,
          ch.created_at,
          '/admin/cargos/' || ch.id::text
        from public.charges ch
        join public.clients c on c.id = ch.client_id
        union all
        select
          'payment', c.full_name,
          'Pago confirmado',
          p.confirmed_at,
          '/admin/pagos/' || p.id::text
        from public.payments p
        join public.clients c on c.id = p.client_id
        where p.status = 'confirmed'
      ) all_activity
      order by all_activity.occurred_at desc
      limit 10
    ) recent;
  elsif can_clients or can_services then
    select coalesce(jsonb_agg(jsonb_build_object(
      'type', recent.activity_type,
      'label', recent.label,
      'detail', recent.detail,
      'occurred_at', recent.occurred_at,
      'href', recent.href
    ) order by recent.occurred_at desc), '[]'::jsonb)
    into activity_section
    from (
      select * from (
        select
          'client'::text as activity_type,
          c.full_name as label,
          'Cliente creado'::text as detail,
          c.created_at as occurred_at,
          '/admin/clientes/' || c.id::text as href
        from public.clients c
        where can_clients
        union all
        select
          'service', c.full_name,
          'Servicio contratado: ' || sc.name,
          cs.created_at,
          '/admin/clientes/' || c.id::text
        from public.client_services cs
        join public.clients c on c.id = cs.client_id
        join public.service_catalog sc on sc.id = cs.service_id
        where can_services
      ) allowed_activity
      order by allowed_activity.occurred_at desc
      limit 10
    ) recent;
  end if;

  return jsonb_build_object(
    'period', jsonb_build_object(
      'from', effective_from,
      'to', effective_to,
      'previous_from', previous_from,
      'previous_to', previous_to,
      'timezone', 'America/Tegucigalpa'
    ),
    'permissions', jsonb_build_object(
      'clients', can_clients,
      'services', can_services,
      'financial', can_financial
    ),
    'clients', clients_section,
    'services', services_section,
    'financial', financial_section,
    'recent_activity', activity_section
  );
end;
$$;

revoke all on function public.get_dashboard_summary(date, date, text)
from public, anon, authenticated, service_role;
grant execute on function public.get_dashboard_summary(date, date, text)
to authenticated;
