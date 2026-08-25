-- Supabase cloud applies platform defaults to service_role. Make the intended
-- provisioning surface explicit so local and hosted DEV stay reproducible.
revoke all on table public.roles from service_role;
revoke all on table public.permissions from service_role;
revoke all on table public.role_permissions from service_role;
revoke all on table public.profiles from service_role;
revoke all on table public.audit_logs from service_role;

grant select on table public.roles to service_role;
grant select, update on table public.profiles to service_role;
