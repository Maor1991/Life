import { REST_TYPE, WALK_TYPE } from './workoutTypes';

/** true if `weekday` (0 = Sunday .. 6 = Saturday) is the user's configured rest day. */
export function isRestDay(weekday: number, restDay: number | null): boolean {
  return restDay != null && weekday === restDay;
}

export interface ProgressWeights {
  workout: number;
  sleep: number;
  nutrition: number;
}

/** How much each category contributes to the daily percentage, as fractions summing to 1 — user-adjustable, see useProgressWeights. */
export const DEFAULT_PROGRESS_WEIGHTS: ProgressWeights = { workout: 0.3, sleep: 0.3, nutrition: 0.4 };

/**
 * Redistributes the remaining share across the other two keys proportional
 * to their current ratio — the standard "three sliders that sum to 100%"
 * balance, so nudging one never breaks the total.
 */
export function rebalanceWeights(
  weights: ProgressWeights,
  changed: keyof ProgressWeights,
  value: number
): ProgressWeights {
  const clamped = Math.max(0, Math.min(1, value));
  const others = (Object.keys(weights) as (keyof ProgressWeights)[]).filter((k) => k !== changed);
  const remaining = 1 - clamped;
  const otherSum = others.reduce((sum, k) => sum + weights[k], 0);

  const next = { ...weights, [changed]: clamped } as ProgressWeights;
  others.forEach((k) => {
    next[k] = otherSum > 0 ? (weights[k] / otherSum) * remaining : remaining / others.length;
  });
  return next;
}

/** Assumed when no sleep session was logged for the day — most nights are fine even if never logged. */
const DEFAULT_SLEEP_HOURS = 8;
/** 6-8 logged hours is full credit; below 6 scales down toward 0 at 0h; above 8 stays full credit. */
const SLEEP_TARGET_MIN = 6;
const SLEEP_TARGET_MAX = 8;

export interface WorkoutDaySignals {
  /** A real workout was logged — a quick muscle pick or a full detailed session. */
  trained: boolean;
  /** A walk was logged (independent of `trained`). */
  walked: boolean;
  /** The user's configured weekly rest day, or an explicit "day off" mark. */
  restDay: boolean;
}

/**
 * 0-100 workout share for one day: a rest day is full credit; training
 * alone is 90, a walk on top of training completes it to 100; a walk with
 * no training is worth 10 on its own; nothing logged is 0.
 */
export function workoutDayScore({ trained, walked, restDay }: WorkoutDaySignals): number {
  if (restDay) return 100;
  return Math.min(100, (trained ? 90 : 0) + (walked ? 10 : 0));
}

/**
 * Reads a day's workout signals off its logged sessions — a walk-type
 * session, an explicit "day off" mark, or anything else (a quick muscle
 * pick or a full detailed workout) counting as trained — plus the user's
 * configured weekly rest day. One source of truth for the streak, the
 * calendar, and the progress chart.
 */
export function deriveWorkoutSignals(
  sessions: { workoutType: string }[],
  weekday: number,
  restDayOfWeek: number | null
): WorkoutDaySignals {
  const walked = sessions.some((s) => s.workoutType === WALK_TYPE);
  const explicitRest = sessions.some((s) => s.workoutType === REST_TYPE);
  const trained = sessions.some((s) => s.workoutType !== WALK_TYPE && s.workoutType !== REST_TYPE);
  return { trained, walked, restDay: explicitRest || isRestDay(weekday, restDayOfWeek) };
}

/**
 * 0-100 sleep share for one day. Hours default to 8 when nothing was
 * logged — an unlogged night reads as "probably fine", not "failed" — and
 * 6-8 hours earns full credit either way.
 */
export function sleepDayScore(hours: number | null): number {
  const h = hours ?? DEFAULT_SLEEP_HOURS;
  if (h >= SLEEP_TARGET_MIN && h <= SLEEP_TARGET_MAX) return 100;
  if (h < SLEEP_TARGET_MIN) return Math.max(0, Math.round((h / SLEEP_TARGET_MIN) * 100));
  return 100;
}

export interface DayCompletionInput {
  mealTemplatesCount: number;
  checkedMeals: number;
  workout: WorkoutDaySignals;
  /** Hours logged for the day's sleep, or null if nothing was logged. */
  sleepHours: number | null;
}

export interface DayScoreBreakdown {
  workoutPct: number;
  sleepPct: number;
  nutritionPct: number;
  totalPct: number;
}

/**
 * Each category's own 0-100 score plus the weighted total — nutrition is
 * proportional (checked meals ÷ total meal templates, since meals are
 * typically "do all of these every day"); a day with no meal templates
 * configured counts as fully satisfied for that share, since nothing was
 * expected. Workout and sleep come from their own scoring functions above.
 */
export function computeDayBreakdown(
  input: DayCompletionInput,
  weights: ProgressWeights = DEFAULT_PROGRESS_WEIGHTS
): DayScoreBreakdown {
  const nutritionPct =
    input.mealTemplatesCount > 0 ? Math.round((input.checkedMeals / input.mealTemplatesCount) * 100) : 100;
  const workoutPct = workoutDayScore(input.workout);
  const sleepPct = sleepDayScore(input.sleepHours);

  const totalPct = Math.round(
    sleepPct * weights.sleep + workoutPct * weights.workout + nutritionPct * weights.nutrition
  );

  return { workoutPct, sleepPct, nutritionPct, totalPct };
}

export function computeDayPct(input: DayCompletionInput, weights?: ProgressWeights): number {
  return computeDayBreakdown(input, weights).totalPct;
}
