-- CogniHood Supabase schema
-- Run in Supabase SQL Editor or via: supabase db push

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  cogni_id text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Trip records
create table if not exists public.trips (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_time bigint not null,
  end_time bigint not null,
  duration_ms bigint not null,
  avg_score numeric not null,
  min_score numeric not null,
  max_score numeric not null,
  state text not null check (state in ('SAFE', 'WARNING', 'CRITICAL')),
  cog_load text not null check (cog_load in ('LOW', 'MED', 'HIGH')),
  incidents integer not null default 0,
  distance_mi numeric not null default 0,
  events jsonb not null default '[]'::jsonb,
  coaching_tips jsonb not null default '[]'::jsonb,
  eligibility_flags integer not null default 0,
  hypnosis_events integer not null default 0,
  attention_failures integer not null default 0,
  harsh_brakes integer not null default 0,
  harsh_accels integer not null default 0,
  avg_perclos numeric not null default 0,
  avg_hhi numeric not null default 0,
  avg_distraction numeric not null default 0,
  fingerprint_deviation numeric not null default 0,
  reckless_flag boolean not null default false,
  national_percentile integer not null default 0,
  national_comparison jsonb not null default '{}'::jsonb,
  score_timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_start_time_idx on public.trips(start_time desc);

alter table public.trips enable row level security;

create policy "trips_select_own"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "trips_insert_own"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "trips_update_own"
  on public.trips for update
  using (auth.uid() = user_id);

create policy "trips_delete_own"
  on public.trips for delete
  using (auth.uid() = user_id);

-- Cognitive fingerprint (personal baseline)
create table if not exists public.cognitive_fingerprints (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trip_count integer not null default 0,
  avg_safety_score numeric not null default 0,
  avg_perclos numeric not null default 0,
  avg_hhi numeric not null default 0,
  avg_distraction numeric not null default 0,
  harsh_brakes_per_hour numeric not null default 0,
  harsh_accels_per_hour numeric not null default 0,
  std_safety_score numeric not null default 0,
  std_harsh_brakes numeric not null default 0,
  updated_at bigint not null
);

alter table public.cognitive_fingerprints enable row level security;

create policy "fingerprints_select_own"
  on public.cognitive_fingerprints for select
  using (auth.uid() = user_id);

create policy "fingerprints_insert_own"
  on public.cognitive_fingerprints for insert
  with check (auth.uid() = user_id);

create policy "fingerprints_update_own"
  on public.cognitive_fingerprints for update
  using (auth.uid() = user_id);

-- Auto-create profile on sign-up (email or anonymous)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, cogni_id, display_name)
  values (
    new.id,
    'COG_' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Driver')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable anonymous sign-in in Supabase Dashboard:
-- Authentication → Providers → Anonymous sign-ins → Enable

-- Optional: enable realtime sync for trip archives UI
-- alter publication supabase_realtime add table public.trips;
