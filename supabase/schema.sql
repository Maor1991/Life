-- Life — Supabase schema.
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- Design notes:
--   * Every table carries user_id and is protected by RLS, so the anon key
--     shipped in the app can only ever reach the signed-in user's own rows.
--   * Dates and times stay TEXT ('YYYY-MM-DD', 'HH:MM') exactly as the app
--     already treats them, so no formatting behaviour changes.
--   * muscle_groups / items become real jsonb instead of stringified JSON.

-- ---------------------------------------------------------------- profile --

create table if not exists public.profile (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null unique default auth.uid()
                          references auth.users(id) on delete cascade,
  height_cm             real not null,
  weight_kg             real not null,
  age                   integer not null,
  sex                   text not null,
  activity_level        text not null,
  typical_intensity     text not null default 'moderate',
  weekly_workout_target integer not null,
  sleep_target_hours    real not null,
  weight_workout        real not null default 33.34,
  weight_sleep          real not null default 33.33,
  weight_nutrition      real not null default 33.33
);

-- ------------------------------------------------------- workout sessions --

create table if not exists public.workout_sessions (
  id               bigint generated always as identity primary key,
  user_id          uuid not null default auth.uid()
                     references auth.users(id) on delete cascade,
  date             text not null,
  notes            text,
  intensity        text not null default 'moderate',
  workout_type     text not null default 'חדר כושר',
  muscle_groups    jsonb not null default '[]'::jsonb,
  avg_heart_rate   real,
  max_heart_rate   real,
  distance_km      real,
  duration_minutes real,
  elevation_m      real
);

create index if not exists idx_workout_sessions_user_date
  on public.workout_sessions (user_id, date);

create table if not exists public.workout_sets (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid()
                  references auth.users(id) on delete cascade,
  session_id    bigint not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  muscle_group  text not null default '',
  weight_kg     real not null,
  reps          integer not null,
  set_number    integer not null
);

create index if not exists idx_workout_sets_session on public.workout_sets (session_id);
create index if not exists idx_workout_sets_user_exercise
  on public.workout_sets (user_id, exercise_name);

-- ---------------------------------------------------------------- sleep ----

create table if not exists public.sleep_sessions (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
            references auth.users(id) on delete cascade,
  date    text not null,
  kind    text not null default 'night' check (kind in ('night', 'nap')),
  hours   real not null,
  quality integer not null check (quality between 1 and 5)
);

create index if not exists idx_sleep_sessions_user_date
  on public.sleep_sessions (user_id, date);

-- ------------------------------------------------------------- nutrition ---

create table if not exists public.meals (
  id        bigint generated always as identity primary key,
  user_id   uuid not null default auth.uid()
              references auth.users(id) on delete cascade,
  date      text not null,
  time      text not null,
  name      text not null,
  protein_g real not null,
  carbs_g   real not null,
  fat_g     real not null,
  items     jsonb not null default '[]'::jsonb
);

create index if not exists idx_meals_user_date on public.meals (user_id, date);

create table if not exists public.custom_foods (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid()
                  references auth.users(id) on delete cascade,
  name          text not null,
  protein_g     real not null,
  carbs_g       real not null,
  fat_g         real not null,
  serving_grams real
);

create table if not exists public.saved_meals (
  id        bigint generated always as identity primary key,
  user_id   uuid not null default auth.uid()
              references auth.users(id) on delete cascade,
  name      text not null,
  protein_g real not null,
  carbs_g   real not null,
  fat_g     real not null,
  items     jsonb not null default '[]'::jsonb
);

-- ------------------------------------------------------------------ RLS ----
-- Without these policies the anon key would expose every user's data.

alter table public.profile          enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets     enable row level security;
alter table public.sleep_sessions   enable row level security;
alter table public.meals            enable row level security;
alter table public.custom_foods     enable row level security;
alter table public.saved_meals      enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profile', 'workout_sessions', 'workout_sets',
    'sleep_sessions', 'meals', 'custom_foods', 'saved_meals'
  ] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I
         for all to authenticated
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ RPC ----
-- PostgREST cannot express GROUP BY, so the four aggregate queries the app
-- relies on live here as functions. They are SECURITY INVOKER (the default),
-- so the RLS policies above still apply inside them.

-- Sums each day's sleep and averages quality weighted by hours, so a long
-- night counts more than a short nap. Mirrors the old SQLite aggregate.
create or replace function public.sleep_day_summaries(p_limit integer default 400)
returns table (date text, hours real, quality real)
language sql
stable
set search_path = public
as $$
  select s.date,
         sum(s.hours)::real as hours,
         (case when sum(s.hours) > 0
               then sum(s.quality * s.hours) / sum(s.hours)
               else avg(s.quality) end)::real as quality
  from public.sleep_sessions s
  group by s.date
  order by s.date desc
  limit p_limit;
$$;

create or replace function public.exercise_names()
returns table (exercise_name text)
language sql
stable
set search_path = public
as $$
  select distinct s.exercise_name
  from public.workout_sets s
  order by s.exercise_name asc;
$$;

-- Previously used exercise names for a muscle, most recent first.
create or replace function public.exercise_names_by_muscle(p_muscle text)
returns table (exercise_name text)
language sql
stable
set search_path = public
as $$
  select s.exercise_name
  from public.workout_sets s
  where s.muscle_group = p_muscle
  group by s.exercise_name
  order by max(s.id) desc;
$$;

create or replace function public.exercise_history(p_exercise text)
returns table (date text, max_weight real)
language sql
stable
set search_path = public
as $$
  select ws.date, max(s.weight_kg)::real as max_weight
  from public.workout_sets s
  join public.workout_sessions ws on ws.id = s.session_id
  where s.exercise_name = p_exercise
  group by ws.date
  order by ws.date asc;
$$;
