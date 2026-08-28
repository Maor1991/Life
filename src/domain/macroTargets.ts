import type { WorkoutIntensity } from '../types';

export type Sex = 'male' | 'female';

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MacroBreakdown extends MacroTargets {
  bmr: number;
  activityMultiplier: number;
}

/**
 * Standard dietitian PAL (Physical Activity Level) bands — sedentary
 * through very active — the same tiers used by most TDEE calculators.
 * Which band applies is decided by planned weekly workouts weighted by
 * how hard they are, so a plan of 3 very-high-intensity sessions lands in
 * a higher band than 3 light ones.
 */
const INTENSITY_WEIGHT: Record<WorkoutIntensity, number> = {
  light: 0.7,
  moderate: 1.0,
  high: 1.3,
  very_high: 1.6,
};

function activityMultiplier(workoutsPerWeek: number, intensity: WorkoutIntensity): number {
  const weighted = workoutsPerWeek * INTENSITY_WEIGHT[intensity];
  if (weighted <= 0) return 1.2; // sedentary
  if (weighted <= 2) return 1.375; // light
  if (weighted <= 4) return 1.55; // moderate
  if (weighted <= 6) return 1.725; // active
  return 1.9; // very active
}

/**
 * Mifflin-St Jeor BMR, scaled by the planned activity level, then split
 * into a moderate-high-protein macro target (protein by bodyweight, fat as
 * 25% of calories, carbs filling the rest). Returns the intermediate BMR
 * and multiplier too, so the UI can show the worked example, not just the
 * final numbers.
 */
export function computeMacroBreakdown(
  heightCm: number,
  weightKg: number,
  age: number,
  sex: Sex,
  workoutsPerWeek: number,
  intensity: WorkoutIntensity
): MacroBreakdown {
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161));
  const multiplier = activityMultiplier(workoutsPerWeek, intensity);
  const calories = Math.round(bmr * multiplier);

  const proteinG = Math.round(weightKg * 1.8);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { bmr, activityMultiplier: multiplier, calories, proteinG, carbsG, fatG };
}

export function computeMacroTargets(
  heightCm: number,
  weightKg: number,
  age: number,
  sex: Sex,
  workoutsPerWeek: number,
  intensity: WorkoutIntensity
): MacroTargets {
  const { calories, proteinG, carbsG, fatG } = computeMacroBreakdown(
    heightCm,
    weightKg,
    age,
    sex,
    workoutsPerWeek,
    intensity
  );
  return { calories, proteinG, carbsG, fatG };
}
