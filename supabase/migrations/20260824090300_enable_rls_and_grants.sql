alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.roles from public, anon, authenticated;
revoke all on table public.permissions from public, anon, authenticated;
revoke all on table public.role_permissions from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.audit_logs from public, anon, authenticated;

grant select, insert, update, delete on table public.roles to authenticated;
grant select, insert, update, delete on table public.permissions to authenticated;
grant select, insert, update, delete on table public.role_permissions to authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.audit_logs to authenticated;

-- Administrative provisioning only. service_role remains server-side and
-- bypasses RLS by design, but receives no audit-log mutation privilege.
grant select on table public.roles to service_role;
grant select, update on table public.profiles to service_role;

create policy roles_select_managers
on public.roles for select to authenticated
using (public.has_permission('users.manage'));

create policy roles_insert_managers
on public.roles for insert to authenticated
with check (public.has_permission('users.manage'));

create policy roles_update_managers
on public.roles for update to authenticated
using (public.has_permission('users.manage'))
with check (public.has_permission('users.manage'));

create policy roles_delete_managers
on public.roles for delete to authenticated
using (public.has_permission('users.manage'));

create policy permissions_select_managers
on public.permissions for select to authenticated
using (public.has_permission('users.manage'));

create policy permissions_insert_managers
on public.permissions for insert to authenticated
with check (public.has_permission('users.manage'));

create policy permissions_update_managers
on public.permissions for update to authenticated
using (public.has_permission('users.manage'))
with check (public.has_permission('users.manage'));

create policy permissions_delete_managers
on public.permissions for delete to authenticated
using (public.has_permission('users.manage'));

create policy role_permissions_select_managers
on public.role_permissions for select to authenticated
using (public.has_permission('users.manage'));

create policy role_permissions_insert_managers
on public.role_permissions for insert to authenticated
with check (public.has_permission('users.manage'));

create policy role_permissions_delete_managers
on public.role_permissions for delete to authenticated
using (public.has_permission('users.manage'));

create policy profiles_select_own_or_managed
on public.profiles for select to authenticated
using (id = auth.uid() or public.has_permission('users.manage'));

create policy profiles_update_own_or_managed
on public.profiles for update to authenticated
using (id = auth.uid() or public.has_permission('users.manage'))
with check (id = auth.uid() or public.has_permission('users.manage'));

create policy audit_logs_select_readers
on public.audit_logs for select to authenticated
using (public.has_permission('audit.read'));

alter table public.roles force row level security;
alter table public.permissions force row level security;
alter table public.role_permissions force row level security;
alter table public.profiles force row level security;
alter table public.audit_logs force row level security;
