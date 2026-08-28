import type { WorkoutSession } from '../types';
import { MUSCLE_GROUPS } from './workoutTypes';
import { addDays } from './dates';

export interface MuscleBalanceEntry {
  muscle: string;
  lastDate: string | null;
  daysSince: number | null;
  /** Sessions within the caller's window (14 or 30 days — see computeMuscleBalance). */
  sessionsInWindow: number;
}

function daysBetween(from: string, to: string): number {
  let count = 0;
  let cursor = from;
  while (cursor < to) {
    cursor = addDays(cursor, 1);
    count += 1;
  }
  return count;
}

/**
 * Most-neglected muscle first: never trained, then longest since the last
 * session. Surfaces training imbalance instead of a flat log.
 *
 * `windowDays` defaults to 14 — a short history reads as noisy imbalance
 * once there are 30 days of real data behind it, so callers should widen it
 * to 30 only once the account is old enough to have that much history.
 */
export function computeMuscleBalance(
  sessions: WorkoutSession[],
  today: string,
  windowDays = 14
): MuscleBalanceEntry[] {
  const cutoff = addDays(today, -(windowDays - 1));

  // Abs isn't one of the Home week tracker's quick picks, so it never gets
  // trained through it and just sits at "never trained" — drop it here
  // rather than from MUSCLE_GROUPS globally, since exercise-level tagging
  // elsewhere still wants it as an option.
  return MUSCLE_GROUPS.filter(({ value }) => value !== 'abs').map(({ value }) => {
    let lastDate: string | null = null;
    let sessionsInWindow = 0;

    for (const session of sessions) {
      if (!session.muscleGroups.includes(value)) continue;
      // A day marked ahead of time (the week tracker allows the whole week)
      // hasn't happened yet — it shouldn't read as "trained today".
      if (session.date > today) continue;
      if (!lastDate || session.date > lastDate) lastDate = session.date;
      if (session.date >= cutoff) sessionsInWindow += 1;
    }

    return {
      muscle: value,
      lastDate,
      daysSince: lastDate ? daysBetween(lastDate, today) : null,
      sessionsInWindow,
    };
  }).sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return 0;
    if (a.daysSince === null) return -1;
    if (b.daysSince === null) return 1;
    return b.daysSince - a.daysSince;
  });
}
