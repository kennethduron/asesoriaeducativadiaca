-- F8 import completed and reconciled. Remove the temporary write bridge.
drop function public.import_verified_legacy_task(uuid,text,text,text,boolean,timestamptz,uuid);
