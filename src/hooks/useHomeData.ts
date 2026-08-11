import { useCallback, useEffect, useState } from 'react';
import { getSessions, getSessionsByDate } from '../db/queries/workouts';
import { getSleepDaySummaries, getSleepSessionsByDate } from '../db/queries/sleep';
import { getMealsByDate } from '../db/queries/nutrition';
import { getCustomFoods } from '../db/queries/customFoods';
import { setCustomFoods } from '../domain/foods';
import { weekRange } from '../domain/dates';
import type {
  Meal,
  SleepDaySummary,
  SleepSession,
  WorkoutSession,
  WorkoutSessionWithSets,
} from '../types';

export interface HomeData {
  allSessions: WorkoutSession[];
  sleepSummaries: SleepDaySummary[];
  workoutsThisWeek: number;
  /** Everything logged on the currently selected day. */
  dayWorkouts: WorkoutSessionWithSets[];
  daySleep: SleepSession[];
  dayMeals: Meal[];
  /** Today's data, used by the "what's missing" card regardless of selection. */
  todayMeals: Meal[];
  todaySleep: SleepSession[];
}

const EMPTY: HomeData = {
  allSessions: [],
  sleepSummaries: [],
  workoutsThisWeek: 0,
  dayWorkouts: [],
  daySleep: [],
  dayMeals: [],
  todayMeals: [],
  todaySleep: [],
};

export function useHomeData(today: string, selectedDate: string) {
  const [data, setData] = useState<HomeData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [
      allSessions,
      sleepSummaries,
      dayWorkouts,
      daySleep,
      dayMeals,
      todayMeals,
      todaySleep,
      customFoods,
    ] = await Promise.all([
      getSessions(),
      getSleepDaySummaries(400),
      getSessionsByDate(selectedDate),
      getSleepSessionsByDate(selectedDate),
      getMealsByDate(selectedDate),
      getMealsByDate(today),
      getSleepSessionsByDate(today),
      getCustomFoods(),
    ]);

    // Meals reference custom foods by id, so the registry must be loaded
    // before any macro lookup happens.
    setCustomFoods(customFoods);

    const [monday] = weekRange(today);
    const workoutsThisWeek = allSessions.filter(
      (s) => s.date >= monday && s.date <= today
    ).length;

    setData({
      allSessions,
      sleepSummaries,
      workoutsThisWeek,
      dayWorkouts,
      daySleep,
      dayMeals,
      todayMeals,
      todaySleep,
    });
    setLoading(false);
  }, [today, selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
