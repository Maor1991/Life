alter table public.nutrition_goal
  add column if not exists workouts_per_week integer,
  add column if not exists planned_intensity text;
