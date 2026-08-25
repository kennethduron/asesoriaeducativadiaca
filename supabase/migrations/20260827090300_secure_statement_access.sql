revoke all on table public.open_charge_details,
  public.client_account_summary,
  public.client_aging_summary,
  public.client_financial_activity
from public, anon, authenticated, service_role;

grant select on table public.open_charge_details,
  public.client_account_summary,
  public.client_aging_summary,
  public.client_financial_activity
to authenticated;

grant execute on function public.search_client_accounts(text, text, text, text, text, integer, integer)
to authenticated;
grant execute on function public.get_client_statement(uuid, text, date, date)
to authenticated;

create or replace function public.record_client_statement_generated(
  target_client_id uuid,
  currency_filter text,
  from_date date,
  to_date date,
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
  if not public.has_permission('charges.read')
     or not public.has_permission('payments.read')
     or not public.has_permission('reports.export') then
    raise exception 'Permission denied';
  end if;
  if target_client_id is null
     or currency_filter is null
     or currency_filter !~ '^[A-Z]{3}$'
     or from_date is null
     or to_date is null
     or from_date > to_date
     or operation_correlation_id is null then
    raise exception 'Invalid statement parameters';
  end if;
  if not exists (select 1 from public.clients c where c.id = target_client_id) then
    raise exception 'Client not found';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, correlation_id
  ) values (
    actor,
    'client_statement.generated',
    'client',
    target_client_id,
    jsonb_build_object(
      'currency_code', currency_filter,
      'period_from', from_date,
      'period_to', to_date
    ),
    operation_correlation_id
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.record_client_statement_generated(uuid, text, date, date, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.record_client_statement_generated(uuid, text, date, date, uuid)
to authenticated;
