import type { DailyScoreBreakdown, MacroTargets, Profile } from '../types';
import { addDays, weekRange } from './dates';
import { computeDailyTotal, computeNutritionPct, computeSleepPct, computeWorkoutPct } from './scoring';

export interface RangeInputs {
  startDate: string;
  endDate: string;
  profile: Profile;
  macroTargets: MacroTargets;
  sessionDates: string[];
  sleepLogsByDate: Record<string, { hours: number; quality: number }>;
  mealTotalsByDate: Record<string, { proteinG: number; carbsG: number; fatG: number }>;
}

export function computeScoresForRange(input: RangeInputs): DailyScoreBreakdown[] {
  const {
    startDate,
    endDate,
    profile,
    macroTargets,
    sessionDates,
    sleepLogsByDate,
    mealTotalsByDate,
  } = input;

  const results: DailyScoreBreakdown[] = [];
  let date = startDate;

  while (date <= endDate) {
    const [monday] = weekRange(date);
    const sessionsThisWeekSoFar = sessionDates.filter((d) => d >= monday && d <= date).length;
    const workoutPct = computeWorkoutPct(date, sessionsThisWeekSoFar, profile.weeklyWorkoutTarget);

    const sleep = sleepLogsByDate[date];
    const sleepPct = computeSleepPct(
      sleep ? sleep.hours : null,
      sleep ? sleep.quality : null,
      profile.sleepTargetHours
    );

    const meals = mealTotalsByDate[date];
    const nutritionPct = computeNutritionPct(meals ?? null, macroTargets);

    const totalPct = computeDailyTotal(workoutPct, sleepPct, nutritionPct, {
      workout: profile.weightWorkout,
      sleep: profile.weightSleep,
      nutrition: profile.weightNutrition,
    });

    results.push({ date, workoutPct, sleepPct, nutritionPct, totalPct });
    date = addDays(date, 1);
  }

  return results;
}
