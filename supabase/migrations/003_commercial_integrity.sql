-- Commercial-integrity hardening for CogniHood.
-- Apply after 001_initial_schema.sql and 002_security_hardening.sql.

alter table public.trips
  add column if not exists algorithm_version text not null default 'legacy',
  add column if not exists measurement_source text not null default 'BROWSER_CAMERA',
  add column if not exists cloud_analysis_used boolean not null default false,
  add column if not exists cloud_consent_at bigint,
  add column if not exists data_quality text not null default 'VALID';

alter table public.trips
  add constraint trips_minimum_valid_session check (duration_ms >= 30000) not valid,
  add constraint trips_duration_consistency check (end_time - start_time = duration_ms) not valid,
  add constraint trips_algorithm_version_length check (char_length(algorithm_version) between 1 and 40) not valid,
  add constraint trips_measurement_source check (measurement_source in ('BROWSER_CAMERA')) not valid,
  add constraint trips_data_quality check (data_quality in ('VALID')) not valid,
  add constraint trips_cloud_consent check (not cloud_analysis_used or cloud_consent_at is not null) not valid;

create index if not exists trips_user_start_idx on public.trips(user_id, start_time desc);

create table if not exists public.ai_global_rate_limits (
  bucket text primary key,
  day_started_at timestamptz not null default now(),
  daily_count integer not null default 0 check (daily_count >= 0)
);
alter table public.ai_global_rate_limits enable row level security;
revoke all on public.ai_global_rate_limits from anon, authenticated;

create or replace function public.consume_ai_global_quota(p_daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.ai_global_rate_limits%rowtype;
  safe_limit integer := greatest(1, least(p_daily_limit, 1000000));
begin
  insert into public.ai_global_rate_limits (bucket) values ('global') on conflict do nothing;
  select * into current_row from public.ai_global_rate_limits where bucket = 'global' for update;
  if current_row.day_started_at <= clock_timestamp() - interval '24 hours' then
    update public.ai_global_rate_limits set day_started_at = clock_timestamp(), daily_count = 1 where bucket = 'global';
    return true;
  end if;
  if current_row.daily_count >= safe_limit then return false; end if;
  update public.ai_global_rate_limits set daily_count = daily_count + 1 where bucket = 'global';
  return true;
end;
$$;
revoke all on function public.consume_ai_global_quota(integer) from public, anon, authenticated;
grant execute on function public.consume_ai_global_quota(integer) to service_role;

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('CLOUD_FRAME_PROCESSING')),
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  trip_id text references public.trips(id) on delete set null
);

alter table public.consent_records enable row level security;
revoke all on public.consent_records from anon, authenticated;
grant select on public.consent_records to authenticated;

drop policy if exists "consent_select_own" on public.consent_records;
create policy "consent_select_own"
  on public.consent_records for select
  using (auth.uid() = user_id);

-- Generate a public account reference with 80 UUID-derived bits instead of 32.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, cogni_id, display_name)
  values (
    new.id,
    'COG_' || upper(substr(replace(new.id::text, '-', ''), 1, 20)),
    left(coalesce(new.raw_user_meta_data->>'display_name', 'Driver'), 120)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Recompute the personal reference on the server whenever a trip changes.
create or replace function public.recompute_cognitive_fingerprint(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  trip_total integer;
begin
  select count(*)::integer into trip_total
  from public.trips where user_id = p_user_id;

  if trip_total = 0 then
    delete from public.cognitive_fingerprints where user_id = p_user_id;
    return;
  end if;

  insert into public.cognitive_fingerprints (
    user_id, trip_count, avg_safety_score, avg_perclos, avg_hhi, avg_distraction,
    harsh_brakes_per_hour, harsh_accels_per_hour, std_safety_score,
    std_harsh_brakes, updated_at
  )
  select
    p_user_id,
    count(*)::integer,
    avg(avg_score), avg(avg_perclos), avg(avg_hhi), avg(avg_distraction),
    avg(harsh_brakes / greatest(duration_ms / 3600000.0, 1.0 / 60.0)),
    avg(harsh_accels / greatest(duration_ms / 3600000.0, 1.0 / 60.0)),
    coalesce(stddev_pop(avg_score), 0),
    coalesce(stddev_pop(harsh_brakes / greatest(duration_ms / 3600000.0, 1.0 / 60.0)), 0),
    floor(extract(epoch from clock_timestamp()) * 1000)::bigint
  from public.trips where user_id = p_user_id
  on conflict (user_id) do update set
    trip_count = excluded.trip_count,
    avg_safety_score = excluded.avg_safety_score,
    avg_perclos = excluded.avg_perclos,
    avg_hhi = excluded.avg_hhi,
    avg_distraction = excluded.avg_distraction,
    harsh_brakes_per_hour = excluded.harsh_brakes_per_hour,
    harsh_accels_per_hour = excluded.harsh_accels_per_hour,
    std_safety_score = excluded.std_safety_score,
    std_harsh_brakes = excluded.std_harsh_brakes,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.record_trip(p_trip jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  trip_id text;
  cloud_used boolean := coalesce((p_trip->>'cloud_analysis_used')::boolean, false);
  inserted_rows integer;
  existing_owner uuid;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_trip->>'user_id' is distinct from caller_id::text then raise exception 'User mismatch'; end if;
  if jsonb_typeof(p_trip->'events') is distinct from 'array' or jsonb_array_length(p_trip->'events') > 500 then
    raise exception 'Invalid events payload';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_trip->'events') event
    where jsonb_typeof(event) <> 'object'
      or not (event ? 'id' and event ? 'type' and event ? 'timestamp' and event ? 'severity' and event ? 'message')
      or char_length(coalesce(event->>'message', '')) > 500
  ) then raise exception 'Invalid event item'; end if;
  if jsonb_typeof(p_trip->'score_timeline') is distinct from 'array' or jsonb_array_length(p_trip->'score_timeline') > 5000 then
    raise exception 'Invalid score timeline';
  end if;

  trip_id := p_trip->>'id';
  insert into public.trips (
    id, user_id, start_time, end_time, duration_ms, avg_score, min_score, max_score,
    state, cog_load, incidents, distance_mi, events, coaching_tips, eligibility_flags,
    hypnosis_events, attention_failures, harsh_brakes, harsh_accels, avg_perclos,
    avg_hhi, avg_distraction, fingerprint_deviation, reckless_flag,
    national_percentile, national_comparison, score_timeline, algorithm_version,
    measurement_source, cloud_analysis_used, cloud_consent_at, data_quality
  ) values (
    trip_id, caller_id, (p_trip->>'start_time')::bigint, (p_trip->>'end_time')::bigint,
    (p_trip->>'duration_ms')::bigint, (p_trip->>'avg_score')::numeric,
    (p_trip->>'min_score')::numeric, (p_trip->>'max_score')::numeric,
    p_trip->>'state', p_trip->>'cog_load', (p_trip->>'incidents')::integer,
    (p_trip->>'distance_mi')::numeric, p_trip->'events', p_trip->'coaching_tips',
    (p_trip->>'eligibility_flags')::integer, (p_trip->>'hypnosis_events')::integer,
    (p_trip->>'attention_failures')::integer, (p_trip->>'harsh_brakes')::integer,
    (p_trip->>'harsh_accels')::integer, (p_trip->>'avg_perclos')::numeric,
    (p_trip->>'avg_hhi')::numeric, (p_trip->>'avg_distraction')::numeric,
    (p_trip->>'fingerprint_deviation')::numeric, (p_trip->>'reckless_flag')::boolean,
    (p_trip->>'national_percentile')::integer, p_trip->'national_comparison',
    p_trip->'score_timeline', left(p_trip->>'algorithm_version', 40),
    'BROWSER_CAMERA', cloud_used,
    case when cloud_used then (p_trip->>'cloud_consent_at')::bigint else null end,
    'VALID'
  )
  on conflict (id) do nothing;

  get diagnostics inserted_rows = row_count;
  if inserted_rows = 0 then
    select user_id into existing_owner from public.trips where id = trip_id;
    if existing_owner is distinct from caller_id then raise exception 'Trip identifier conflict'; end if;
    return trip_id;
  end if;

  if cloud_used then
    insert into public.consent_records (user_id, consent_type, policy_version, trip_id)
    values (caller_id, 'CLOUD_FRAME_PROCESSING', '2026-10-13', trip_id);
  end if;

  perform public.recompute_cognitive_fingerprint(caller_id);
  return trip_id;
end;
$$;

revoke all on function public.record_trip(jsonb) from public, anon;
grant execute on function public.record_trip(jsonb) to authenticated;
revoke insert, update on public.trips from authenticated;
revoke insert, update on public.cognitive_fingerprints from authenticated;
drop policy if exists "trips_insert_own" on public.trips;
drop policy if exists "trips_update_own" on public.trips;
drop policy if exists "fingerprints_insert_own" on public.cognitive_fingerprints;
drop policy if exists "fingerprints_update_own" on public.cognitive_fingerprints;

create or replace function public.refresh_fingerprint_after_trip_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_cognitive_fingerprint(old.user_id);
  return old;
end;
$$;

drop trigger if exists refresh_fingerprint_after_trip_delete on public.trips;
create trigger refresh_fingerprint_after_trip_delete
  after delete on public.trips
  for each row execute function public.refresh_fingerprint_after_trip_delete();

-- Run these only after reviewing and cleaning any legacy rows:
-- alter table public.trips validate constraint trips_minimum_valid_session;
-- alter table public.trips validate constraint trips_duration_consistency;
-- alter table public.trips validate constraint trips_algorithm_version_length;
-- alter table public.trips validate constraint trips_measurement_source;
-- alter table public.trips validate constraint trips_data_quality;
-- alter table public.trips validate constraint trips_cloud_consent;
