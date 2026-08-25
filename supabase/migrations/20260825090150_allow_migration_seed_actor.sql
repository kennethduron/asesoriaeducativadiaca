-- Migration runners use different session role names locally and in hosted
-- Supabase. SECURITY DEFINER fixes current_user to the trusted function owner;
-- normal API callers still require grants, RLS and a valid auth.uid().
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
    if current_user <> 'postgres' then
      raise exception 'Authentication required';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then new.created_by := actor; end if;
  new.updated_by := actor;
  return new;
end;
$$;

revoke all on function public.derive_business_actor() from public, anon, authenticated;

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
    if current_user <> 'postgres' then
      raise exception 'Authentication required';
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then new.created_by := actor; end if;
  return new;
end;
$$;

revoke all on function public.derive_note_actor() from public, anon, authenticated;
