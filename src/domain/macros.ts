import type { ActivityLevel, MacroTargets, Sex } from '../types';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function computeBmr(heightCm: number, weightKg: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIER[activityLevel];
}

/**
 * Protein at 2g/kg bodyweight (common target for people who train regularly),
 * fat at 25% of calories, remainder from carbs.
 */
export function computeMacroTargets(
  heightCm: number,
  weightKg: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel
): MacroTargets {
  const bmr = computeBmr(heightCm, weightKg, age, sex);
  const calories = computeTdee(bmr, activityLevel);

  const proteinG = weightKg * 2;
  const fatG = (calories * 0.25) / 9;
  const carbsG = Math.max(0, (calories - proteinG * 4 - fatG * 9) / 4);

  return {
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
  };
}
