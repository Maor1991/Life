import { useCallback, useEffect, useState } from 'react';
import { getCalorieGoal, getNutritionStats, setNutritionStats, type NutritionStats } from '../db/queries/nutritionGoal';
import { computeMacroTargets, type MacroTargets } from '../domain/macroTargets';

const EMPTY_STATS: NutritionStats = {
  heightCm: null,
  weightKg: null,
  age: null,
  sex: null,
  restDayOfWeek: null,
  workoutsPerWeek: null,
  plannedIntensity: null,
};

export function useNutritionTargets() {
  const [stats, setStats] = useState<NutritionStats>(EMPTY_STATS);
  const [fallbackGoal, setFallbackGoal] = useState(2000);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nutritionStats, goal] = await Promise.all([getNutritionStats(), getCalorieGoal()]);
    setStats(nutritionStats);
    setFallbackGoal(goal);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasStats =
    stats.heightCm != null &&
    stats.weightKg != null &&
    stats.age != null &&
    stats.sex != null &&
    stats.workoutsPerWeek != null &&
    stats.plannedIntensity != null;

  const targets: MacroTargets = hasStats
    ? computeMacroTargets(
        stats.heightCm!,
        stats.weightKg!,
        stats.age!,
        stats.sex!,
        stats.workoutsPerWeek!,
        stats.plannedIntensity!
      )
    : { calories: fallbackGoal, proteinG: 0, carbsG: 0, fatG: 0 };

  async function save(next: NutritionStats) {
    await setNutritionStats(next);
    setStats(next);
  }

  return { stats, hasStats, targets, loading, save, refresh };
}
