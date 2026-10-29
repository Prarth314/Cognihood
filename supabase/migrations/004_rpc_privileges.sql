-- Review and apply to a non-production project first. Does not modify records.
-- PostgreSQL grants new functions EXECUTE to PUBLIC unless explicitly revoked.
begin;
do $$
declare signature text;
begin
  foreach signature in array array[
    'public.recompute_cognitive_fingerprint(uuid)',
    'public.handle_new_user()',
    'public.refresh_fingerprint_after_trip_delete()'
  ] loop
    if to_regprocedure(signature) is not null then
      execute 'revoke all on function ' || signature || ' from public, anon, authenticated';
    end if;
  end loop;
  if to_regprocedure('public.recompute_cognitive_fingerprint(uuid)') is not null then
    grant execute on function public.recompute_cognitive_fingerprint(uuid) to service_role;
  end if;
end $$;
commit;
