import { useCallback, useEffect, useState } from 'react';
import { getSessions } from '../db/queries/workouts';
import { getSleepDaySummaries } from '../db/queries/sleep';
import { getRecentMeals } from '../db/queries/nutrition';
import { computeMacroTargets } from '../domain/macros';
import { computeScoresForRange } from '../domain/scoreRange';
import type { DailyScoreBreakdown, Profile } from '../types';

export function useScoreRange(profile: Profile | null, startDate: string, endDate: string) {
  const [scores, setScores] = useState<DailyScoreBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile) {
      setScores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [sessions, sleepLogs, meals] = await Promise.all([
      getSessions(),
      getSleepDaySummaries(400),
      getRecentMeals(2000),
    ]);

    const sessionDates = sessions.map((s) => s.date);

    const sleepLogsByDate: Record<string, { hours: number; quality: number }> = {};
    for (const log of sleepLogs) {
      sleepLogsByDate[log.date] = { hours: log.hours, quality: log.quality };
    }

    const mealTotalsByDate: Record<string, { proteinG: number; carbsG: number; fatG: number }> = {};
    for (const meal of meals) {
      const totals = mealTotalsByDate[meal.date] ?? { proteinG: 0, carbsG: 0, fatG: 0 };
      totals.proteinG += meal.proteinG;
      totals.carbsG += meal.carbsG;
      totals.fatG += meal.fatG;
      mealTotalsByDate[meal.date] = totals;
    }

    const macroTargets = computeMacroTargets(
      profile.heightCm,
      profile.weightKg,
      profile.age,
      profile.sex,
      profile.activityLevel
    );

    const result = computeScoresForRange({
      startDate,
      endDate,
      profile,
      macroTargets,
      sessionDates,
      sleepLogsByDate,
      mealTotalsByDate,
    });

    setScores(result);
    setLoading(false);
  }, [profile, startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { scores, loading, refresh };
}
