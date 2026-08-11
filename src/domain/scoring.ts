import type { MacroTargets } from '../types';
import { isoDayOfWeek } from './dates';

export function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Flexible weekly workout target: on any given day, we expect the user to be
 * "on pace" proportionally to how far into the week we are (Monday = day 1).
 * Example: target 4/week, Wednesday (day 3) -> expected pace = 4 * 3/7 = 1.71.
 */
export function computeWorkoutPct(
  date: string,
  sessionsThisWeekSoFar: number,
  weeklyTarget: number
): number {
  if (weeklyTarget <= 0) return 100;
  const dayIndex = isoDayOfWeek(date); // 1..7
  const expectedPace = weeklyTarget * (dayIndex / 7);
  if (expectedPace <= 0) return 100;
  return clampPct((sessionsThisWeekSoFar / expectedPace) * 100);
}

export function computeSleepPct(
  hours: number | null,
  quality: number | null,
  targetHours: number
): number {
  if (hours == null || quality == null) return 0;
  const hoursPct = targetHours > 0 ? clampPct((hours / targetHours) * 100) : 100;
  const qualityPct = clampPct((quality / 5) * 100);
  return hoursPct * 0.7 + qualityPct * 0.3;
}

export function computeNutritionPct(
  actual: { proteinG: number; carbsG: number; fatG: number } | null,
  target: MacroTargets
): number {
  if (!actual) return 0;
  const ratios = [
    target.proteinG > 0 ? actual.proteinG / target.proteinG : 1,
    target.carbsG > 0 ? actual.carbsG / target.carbsG : 1,
    target.fatG > 0 ? actual.fatG / target.fatG : 1,
  ].map((r) => clampPct(r * 100));
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
}

export interface DomainWeights {
  workout: number;
  sleep: number;
  nutrition: number;
}

export function computeDailyTotal(
  workoutPct: number,
  sleepPct: number,
  nutritionPct: number,
  weights: DomainWeights
): number {
  const weightSum = weights.workout + weights.sleep + weights.nutrition;
  if (weightSum <= 0) return 0;
  const weighted =
    workoutPct * weights.workout + sleepPct * weights.sleep + nutritionPct * weights.nutrition;
  return clampPct(weighted / weightSum);
}

/**
 * Counts consecutive days (most recent first) where totalPct reached 100%.
 * Stops at the first day below the threshold.
 */
export function computeStreak(
  scoresMostRecentFirst: { totalPct: number }[],
  threshold = 99.5
): number {
  let streak = 0;
  for (const score of scoresMostRecentFirst) {
    if (score.totalPct >= threshold) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}
