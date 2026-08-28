-- Life — daily calorie goal migration.
-- Paste into the Supabase SQL Editor and run once.
-- One number: the daily calorie goal shown as "remaining" on Home. Not the
-- old height/weight/activity-level profile system — just this.

create table if not exists public.nutrition_goal (
  id            bigint generated always as identity primary key,
  user_id       uuid not null unique default auth.uid()
                  references auth.users(id) on delete cascade,
  calorie_goal  real not null default 2000
);

-- Stats used to compute the calorie/macro targets (BMR/TDEE), instead of a
-- manually typed calorie number. Nullable: the app falls back to the flat
-- default above until these are filled in.
alter table public.nutrition_goal add column if not exists height_cm real;
alter table public.nutrition_goal add column if not exists weight_kg real;
alter table public.nutrition_goal add column if not exists age integer;
alter table public.nutrition_goal add column if not exists sex text;

alter table public.nutrition_goal enable row level security;

drop policy if exists own_rows on public.nutrition_goal;
create policy own_rows on public.nutrition_goal
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
