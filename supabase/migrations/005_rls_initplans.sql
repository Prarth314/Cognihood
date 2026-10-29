-- Preserve existing policy predicates while caching auth.uid() per statement.
-- Review generated policy changes in non-production before applying.
begin;
do $$
declare p record; statement text;
begin
  for p in select * from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'trips', 'cognitive_fingerprints', 'consent_records')
  loop
    statement := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then
      statement := statement || ' using (' || case when p.qual ~* 'select' then p.qual else replace(p.qual, 'auth.uid()', '(select auth.uid())') end || ')';
    end if;
    if p.with_check is not null then
      statement := statement || ' with check (' || case when p.with_check ~* 'select' then p.with_check else replace(p.with_check, 'auth.uid()', '(select auth.uid())') end || ')';
    end if;
    execute statement;
  end loop;
end $$;
commit;
