import { supabase, unwrap } from '../client';
import type { Sex } from '../../domain/macroTargets';
import type { WorkoutIntensity } from '../../types';

const DEFAULT_CALORIE_GOAL = 2000;

export interface NutritionStats {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  /** 0 = Sunday .. 6 = Saturday, or null if no rest day is set. */
  restDayOfWeek: number | null;
  /** Planned weekly workout count, used with plannedIntensity for the activity level. */
  workoutsPerWeek: number | null;
  plannedIntensity: WorkoutIntensity | null;
}

interface NutritionGoalRow {
  calorie_goal: number;
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  sex: string | null;
  rest_day_of_week: number | null;
  workouts_per_week: number | null;
  planned_intensity: string | null;
}

const STATS_COLUMNS = 'height_cm, weight_kg, age, sex, rest_day_of_week, workouts_per_week, planned_intensity';

export async function getNutritionStats(): Promise<NutritionStats> {
  const { data, error } = await supabase
    .from('nutrition_goal')
    .select(STATS_COLUMNS)
    .maybeSingle<
      Pick<
        NutritionGoalRow,
        'height_cm' | 'weight_kg' | 'age' | 'sex' | 'rest_day_of_week' | 'workouts_per_week' | 'planned_intensity'
      >
    >();
  if (error) throw new Error(error.message);
  return {
    heightCm: data?.height_cm ?? null,
    weightKg: data?.weight_kg ?? null,
    age: data?.age ?? null,
    sex: (data?.sex as Sex | null) ?? null,
    restDayOfWeek: data?.rest_day_of_week ?? null,
    workoutsPerWeek: data?.workouts_per_week ?? null,
    plannedIntensity: (data?.planned_intensity as WorkoutIntensity | null) ?? null,
  };
}

export async function setNutritionStats(stats: NutritionStats): Promise<void> {
  unwrap(
    await supabase.from('nutrition_goal').upsert(
      {
        height_cm: stats.heightCm,
        weight_kg: stats.weightKg,
        age: stats.age,
        sex: stats.sex,
        rest_day_of_week: stats.restDayOfWeek,
        workouts_per_week: stats.workoutsPerWeek,
        planned_intensity: stats.plannedIntensity,
      },
      { onConflict: 'user_id' }
    )
  );
}

/** Flat fallback used only until the stats above are filled in. */
export async function getCalorieGoal(): Promise<number> {
  const { data, error } = await supabase
    .from('nutrition_goal')
    .select('calorie_goal')
    .maybeSingle<{ calorie_goal: number }>();
  if (error) throw new Error(error.message);
  return data?.calorie_goal ?? DEFAULT_CALORIE_GOAL;
}
