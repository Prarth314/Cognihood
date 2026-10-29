-- Provisional engineering safeguards. Review limits in staging; no records are deleted.
begin;
create table if not exists public.trip_limits_policy (
  singleton boolean primary key default true check (singleton),
  max_trip_bytes integer not null default 1048576 check (max_trip_bytes between 1024 and 10485760),
  max_trips_per_day integer not null default 120 check (max_trips_per_day between 1 and 10000),
  max_bytes_per_day bigint not null default 16777216 check (max_bytes_per_day > 0),
  max_trips_per_user integer not null default 1000 check (max_trips_per_user between 1 and 100000),
  max_bytes_per_user bigint not null default 104857600 check (max_bytes_per_user > 0),
  max_bytes_global bigint not null default 419430400 check (max_bytes_global > 0)
);
insert into public.trip_limits_policy(singleton) values (true) on conflict do nothing;
create table if not exists public.trip_storage_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trip_count bigint not null default 0 check (trip_count >= 0),
  payload_bytes bigint not null default 0 check (payload_bytes >= 0)
);
create table if not exists public.trip_write_budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default clock_timestamp(),
  trip_count integer not null default 0,
  payload_bytes bigint not null default 0
);
create table if not exists public.trip_global_usage (
  singleton boolean primary key default true check(singleton),
  payload_bytes bigint not null default 0 check (payload_bytes >= 0)
);
alter table public.trip_limits_policy enable row level security;
alter table public.trip_storage_usage enable row level security;
alter table public.trip_write_budgets enable row level security;
alter table public.trip_global_usage enable row level security;
revoke all on public.trip_limits_policy, public.trip_storage_usage, public.trip_write_budgets, public.trip_global_usage from public, anon, authenticated;
grant all on public.trip_limits_policy, public.trip_storage_usage, public.trip_write_budgets, public.trip_global_usage to service_role;

create or replace function public.trip_payload_bytes(p_trip public.trips)
returns bigint language sql immutable set search_path = '' as $$
  select 1024::bigint + octet_length(p_trip.events::text) + octet_length(p_trip.coaching_tips::text)
    + octet_length(p_trip.score_timeline::text) + octet_length(p_trip.national_comparison::text)
    + octet_length(p_trip.id) + octet_length(p_trip.algorithm_version)
$$;
revoke all on function public.trip_payload_bytes(public.trips) from public, anon, authenticated;

-- Initialize/reconcile counters from existing rows. Payload accounting is conservative,
-- not a measurement of physical Postgres/index/backup storage.
insert into public.trip_storage_usage(user_id, trip_count, payload_bytes)
  select user_id, count(*), sum(public.trip_payload_bytes(t)) from public.trips t group by user_id
  on conflict(user_id) do update set trip_count=excluded.trip_count, payload_bytes=excluded.payload_bytes;
update public.trip_storage_usage u set trip_count=0, payload_bytes=0
  where not exists(select 1 from public.trips t where t.user_id=u.user_id);
insert into public.trip_global_usage(singleton,payload_bytes)
  select true, coalesce(sum(payload_bytes),0) from public.trip_storage_usage
  on conflict(singleton) do update set payload_bytes=excluded.payload_bytes;

create or replace function public.track_trip_storage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.trip_global_usage where singleton for update;
  if not found then raise exception 'Storage accounting unavailable'; end if;
  if tg_op in ('DELETE','UPDATE') then
    update public.trip_storage_usage set trip_count=greatest(0,trip_count-1),
      payload_bytes=greatest(0,payload_bytes-public.trip_payload_bytes(old)) where user_id=old.user_id;
    update public.trip_global_usage set payload_bytes=greatest(0,payload_bytes-public.trip_payload_bytes(old)) where singleton;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    update public.trip_global_usage set payload_bytes=payload_bytes+public.trip_payload_bytes(new)
      where singleton and payload_bytes+public.trip_payload_bytes(new) <=
        (select max_bytes_global from public.trip_limits_policy where singleton);
    if not found then raise exception 'Service session storage capacity reached'; end if;
    insert into public.trip_storage_usage(user_id,trip_count,payload_bytes)
      values(new.user_id,1,public.trip_payload_bytes(new))
      on conflict(user_id) do update set trip_count=public.trip_storage_usage.trip_count+1,
        payload_bytes=public.trip_storage_usage.payload_bytes+excluded.payload_bytes;
  end if;
  return null;
end $$;
revoke all on function public.track_trip_storage() from public, anon, authenticated;
drop trigger if exists track_trip_storage on public.trips;
create trigger track_trip_storage after insert or update or delete on public.trips
  for each row execute function public.track_trip_storage();

do $$ begin
  if to_regprocedure('public.record_trip_without_budget(jsonb)') is null then
    alter function public.record_trip(jsonb) rename to record_trip_without_budget;
  end if;
end $$;
revoke all on function public.record_trip_without_budget(jsonb) from public, anon, authenticated;

create or replace function public.record_trip(p_trip jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); policy public.trip_limits_policy%rowtype;
  usage public.trip_storage_usage%rowtype; budget public.trip_write_budgets%rowtype;
  request_bytes bigint;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if p_trip->>'user_id' is distinct from caller::text then raise exception 'User mismatch'; end if;
  select * into policy from public.trip_limits_policy where singleton;
  if not found then raise exception 'Trip limits unavailable'; end if;
  request_bytes := octet_length(p_trip::text)::bigint + 1024;
  if request_bytes > policy.max_trip_bytes then raise exception 'Trip payload exceeds the storage limit'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,7007));
  -- Retries are idempotent and must not spend another write allowance.
  if exists(select 1 from public.trips where id=p_trip->>'id' and user_id=caller) then
    return public.record_trip_without_budget(p_trip);
  end if;
  select * into usage from public.trip_storage_usage where user_id=caller;
  if coalesce(usage.trip_count,0) >= policy.max_trips_per_user
    or coalesce(usage.payload_bytes,0)+request_bytes > policy.max_bytes_per_user then
    raise exception 'Session storage limit reached. Export or delete older sessions before saving more.';
  end if;
  insert into public.trip_write_budgets(user_id) values(caller) on conflict do nothing;
  update public.trip_write_budgets set started_at=clock_timestamp(),trip_count=0,payload_bytes=0
    where user_id=caller and started_at <= clock_timestamp()-interval '24 hours';
  select * into budget from public.trip_write_budgets where user_id=caller for update;
  if budget.trip_count >= policy.max_trips_per_day or budget.payload_bytes+request_bytes > policy.max_bytes_per_day then
    raise exception 'Session write allowance reached. Retry after the 24-hour allowance resets.';
  end if;
  -- The storage trigger atomically reserves global capacity after insertion;
  -- a rejected reservation rolls back this function and its budget increment.
  update public.trip_write_budgets set trip_count=trip_count+1,payload_bytes=payload_bytes+request_bytes where user_id=caller;
  return public.record_trip_without_budget(p_trip);
end $$;
revoke all on function public.record_trip(jsonb) from public, anon;
grant execute on function public.record_trip(jsonb) to authenticated;
create index if not exists consent_user_accepted_idx on public.consent_records(user_id,accepted_at desc);
commit;
