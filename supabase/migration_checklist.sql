-- Life — checklist pivot migration.
-- Paste this into the Supabase SQL Editor and run it once, after the
-- original schema.sql. Adds workout_templates and the two FK columns that
-- let a checked-off day's meal/session be traced back to its template.

create table if not exists public.workout_templates (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid()
                  references auth.users(id) on delete cascade,
  name          text not null,
  workout_type  text not null default 'חדר כושר',
  muscle_groups jsonb not null default '[]'::jsonb
);

alter table public.meals
  add column if not exists saved_meal_id bigint
    references public.saved_meals(id) on delete set null;

alter table public.workout_sessions
  add column if not exists template_id bigint
    references public.workout_templates(id) on delete set null;

alter table public.workout_templates enable row level security;

drop policy if exists own_rows on public.workout_templates;
create policy own_rows on public.workout_templates
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
