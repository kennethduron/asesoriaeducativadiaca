-- Legacy stores only a boolean completion flag. Preserve that real state
-- without inventing completed_by or completed_at; normal application tasks
-- still require both fields when completed.
alter table public.tasks drop constraint tasks_completion_consistent;
alter table public.tasks add constraint tasks_completion_consistent check (
  (
    status = 'completed'
    and (
      (completed_at is not null and completed_by is not null)
      or (
        completed_at is null
        and completed_by is null
        and migration_metadata @> '{"source":"diaca-crm","legacy_done":true}'::jsonb
      )
    )
  )
  or (status <> 'completed' and completed_at is null and completed_by is null)
);

create or replace function public.import_verified_legacy_task(
  legacy_task_id uuid,
  legacy_title text,
  legacy_assignee_label text,
  legacy_due_raw text,
  legacy_done boolean,
  legacy_created_at timestamptz,
  migration_actor uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Permission denied';
  end if;
  if legacy_assignee_label not in ('Equipo DIACA', 'Equipo legal', 'Equipo académico')
    or legacy_due_raw !~ '^\d{4}-\d{2}-\d{2}$'
    or legacy_done is distinct from true
    or length(btrim(legacy_title)) not between 1 and 160
    or legacy_created_at is null
  then
    raise exception 'Legacy task validation failed';
  end if;
  if not exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = migration_actor and p.status = 'active' and r.code = 'owner'
  ) then
    raise exception 'Migration actor must be the active Owner';
  end if;
  if exists (
    select 1 from public.tasks
    where id = legacy_task_id
      or (
        migration_metadata ->> 'source' = 'diaca-crm'
        and migration_metadata ->> 'legacy_task_id' = legacy_task_id::text
      )
  ) then
    raise exception 'Legacy task already imported';
  end if;

  insert into public.tasks (
    id, title, description, client_id, client_service_id, assigned_to,
    created_by, priority, status, due_at, completed_at, completed_by,
    created_at, updated_at, migration_metadata
  ) values (
    legacy_task_id,
    btrim(legacy_title),
    null,
    null,
    null,
    null,
    migration_actor,
    'normal',
    'completed',
    (legacy_due_raw::date::timestamp at time zone 'America/Tegucigalpa'),
    null,
    null,
    legacy_created_at,
    legacy_created_at,
    jsonb_build_object(
      'source', 'diaca-crm',
      'legacy_task_id', legacy_task_id,
      'legacy_assignee_label', legacy_assignee_label,
      'legacy_due_raw', legacy_due_raw,
      'legacy_done', legacy_done
    )
  );
end;
$$;

revoke all on function public.import_verified_legacy_task(uuid,text,text,text,boolean,timestamptz,uuid)
from public, anon, authenticated;
grant execute on function public.import_verified_legacy_task(uuid,text,text,text,boolean,timestamptz,uuid)
to service_role;
