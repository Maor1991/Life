-- Life — removes duplicate Home week-tracker sessions that piled up during
-- testing: a muscle/walk/day-off pick for the same date logged more than
-- once (e.g. once in the old broken Hebrew-label format, once after the
-- fix). The widget's squares only ever look at one match per day so they
-- looked fine, but Muscle Balance scans every session and picked up every
-- leftover duplicate, showing muscles as "trained today" when the square
-- for today actually shows something else.
--
-- Keeps only the most recently created (highest id) empty-set session per
-- (date, workout_type) — real detailed workouts (which always have sets)
-- are never touched. Paste into the Supabase SQL Editor and run once.

delete from public.workout_sessions ws
where not exists (select 1 from public.workout_sets s where s.session_id = ws.id)
  and ws.workout_type in ('חדר כושר', 'הליכה', 'חופש')
  and ws.id <> (
    select max(ws2.id)
    from public.workout_sessions ws2
    where ws2.user_id = ws.user_id
      and ws2.date = ws.date
      and ws2.workout_type = ws.workout_type
      and not exists (select 1 from public.workout_sets s2 where s2.session_id = ws2.id)
  );
