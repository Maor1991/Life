-- Life — fixes workout_sessions rows written by the Home week tracker
-- before it switched from storing raw Hebrew muscle labels to storing the
-- real MUSCLE_GROUPS keys (chest/back/biceps/triceps/shoulders/legs) used
-- everywhere else in the app. Without this, those older rows are invisible
-- to Muscle Balance (and anything else that reads muscle_groups), even
-- though they still show correctly inside the week tracker's own squares.
-- Paste into the Supabase SQL Editor and run once. Safe to re-run.

update public.workout_sessions
set muscle_groups = case muscle_groups::text
  when '["חזה"]' then '["chest"]'::jsonb
  when '["גב"]' then '["back"]'::jsonb
  when '["ידיים"]' then '["biceps","triceps"]'::jsonb
  when '["כתפיים"]' then '["shoulders"]'::jsonb
  when '["רגליים"]' then '["legs"]'::jsonb
  else muscle_groups
end
where muscle_groups::text in ('["חזה"]', '["גב"]', '["ידיים"]', '["כתפיים"]', '["רגליים"]');
