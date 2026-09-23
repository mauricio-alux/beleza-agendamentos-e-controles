-- Repository-only preparation. Do not apply remotely without separate authorization.
-- Revoke all overloads: PUBLIC grants are inherited even after a role-specific revoke.
do $$
declare fn record;
begin
  for fn in select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='identify_public_booking_client'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end $$;
