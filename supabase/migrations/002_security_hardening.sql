-- Security hardening for existing CogniHood deployments.
-- Constraints are NOT VALID so legacy rows do not block deployment; all new writes
-- are checked immediately. Validate them after cleaning any historical violations.

alter policy "profiles_update_own" on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter policy "trips_update_own" on public.trips
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter policy "fingerprints_update_own" on public.cognitive_fingerprints
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.profiles
  add constraint profiles_cogni_id_length check (char_length(cogni_id) between 4 and 64) not valid,
  add constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 120) not valid;

alter table public.trips
  add constraint trips_id_length check (char_length(id) between 16 and 80) not valid,
  add constraint trips_time_order check (start_time > 0 and end_time >= start_time and duration_ms between 0 and 86400000) not valid,
  add constraint trips_score_ranges check (
    avg_score between 0 and 100 and min_score between 0 and 100 and max_score between 0 and 100
    and min_score <= avg_score and avg_score <= max_score
  ) not valid,
  add constraint trips_count_ranges check (
    incidents between 0 and 10000 and eligibility_flags between 0 and 10000
    and hypnosis_events between 0 and 10000 and attention_failures between 0 and 10000
    and harsh_brakes between 0 and 10000 and harsh_accels between 0 and 10000
  ) not valid,
  add constraint trips_metric_ranges check (
    distance_mi between 0 and 2000 and avg_perclos between 0 and 100
    and avg_hhi between 0 and 100 and avg_distraction between 0 and 100
    and fingerprint_deviation between 0 and 100 and national_percentile between 0 and 100
  ) not valid,
  add constraint trips_events_shape check (jsonb_typeof(events) = 'array' and jsonb_array_length(events) <= 500) not valid,
  add constraint trips_coaching_shape check (jsonb_typeof(coaching_tips) = 'array' and jsonb_array_length(coaching_tips) <= 100) not valid,
  add constraint trips_timeline_shape check (jsonb_typeof(score_timeline) = 'array' and jsonb_array_length(score_timeline) <= 5000) not valid,
  add constraint trips_json_size check (
    pg_column_size(events) <= 262144
    and pg_column_size(coaching_tips) <= 131072
    and pg_column_size(national_comparison) <= 32768
    and pg_column_size(score_timeline) <= 524288
  ) not valid;

alter table public.cognitive_fingerprints
  add constraint fingerprints_ranges check (
    trip_count between 0 and 100000
    and avg_safety_score between 0 and 100
    and avg_perclos between 0 and 100
    and avg_hhi between 0 and 100
    and avg_distraction between 0 and 100
    and harsh_brakes_per_hour between 0 and 10000
    and harsh_accels_per_hour between 0 and 10000
    and std_safety_score between 0 and 100
    and std_harsh_brakes between 0 and 10000
  ) not valid;

create table if not exists public.ai_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  day_started_at timestamptz not null default now(),
  daily_count integer not null default 0 check (daily_count >= 0)
);

alter table public.ai_rate_limits
  add column if not exists day_started_at timestamptz not null default now(),
  add column if not exists daily_count integer not null default 0 check (daily_count >= 0);

alter table public.ai_rate_limits enable row level security;
revoke all on public.ai_rate_limits from anon, authenticated;

drop function if exists public.consume_ai_quota(uuid, integer, integer);

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_limit integer,
  p_window_seconds integer,
  p_daily_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.ai_rate_limits%rowtype;
  safe_limit integer := greatest(1, least(p_limit, 120));
  safe_window integer := greatest(10, least(p_window_seconds, 3600));
  safe_daily_limit integer := greatest(1, least(p_daily_limit, 10000));
begin
  insert into public.ai_rate_limits (user_id, window_started_at, request_count, day_started_at, daily_count)
  values (p_user_id, clock_timestamp(), 0, clock_timestamp(), 0)
  on conflict (user_id) do nothing;

  select * into current_row
  from public.ai_rate_limits
  where user_id = p_user_id
  for update;

  if current_row.day_started_at <= clock_timestamp() - interval '24 hours' then
    update public.ai_rate_limits
      set day_started_at = clock_timestamp(), daily_count = 0
      where user_id = p_user_id;
    current_row.daily_count := 0;
  end if;

  if current_row.daily_count >= safe_daily_limit then
    return false;
  end if;

  if current_row.window_started_at <= clock_timestamp() - make_interval(secs => safe_window) then
    update public.ai_rate_limits
      set window_started_at = clock_timestamp(), request_count = 1, daily_count = daily_count + 1
      where user_id = p_user_id;
    return true;
  end if;

  if current_row.request_count >= safe_limit then
    return false;
  end if;

  update public.ai_rate_limits
    set request_count = request_count + 1, daily_count = daily_count + 1
    where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, integer, integer, integer) to service_role;
