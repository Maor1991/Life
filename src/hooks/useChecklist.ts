import { useCallback, useEffect, useState } from 'react';
import {
  addMeal,
  deleteMeal,
  getMealsByDate,
  getRecentMeals,
  getSavedMeals,
  updateMeal,
} from '../db/queries/nutrition';
import {
  addSleepSession,
  deleteSleepSession,
  getSleepDaySummaries,
  getSleepSessionsByDate,
  updateSleepSession,
} from '../db/queries/sleep';
import {
  createSession,
  deleteSession,
  getSessions,
  getSessionsByDate,
} from '../db/queries/workouts';
import { getWorkoutTemplates } from '../db/queries/workoutTemplates';
import { getNutritionStats } from '../db/queries/nutritionGoal';
import { nowTime } from '../components/TimePicker';
import { addDays, parseDate, today as todayFn } from '../domain/dates';
import { computeStreak } from '../domain/scoring';
import { computeDayPct, deriveWorkoutSignals } from '../domain/dayCompletion';
import { useProgressWeights } from './useProgressWeights';
import type { Meal, SavedMeal, WorkoutSession, WorkoutSessionWithSets, WorkoutTemplate } from '../types';

const HISTORY_DAYS = 60;
const WEEK_DAYS = 7;
const DEFAULT_SLEEP_HOURS = 8;

export interface WeekDayWorkouts {
  date: string;
  /** 0 = Sunday .. 6 = Saturday, matching common.weekdayInitial.{n} */
  weekday: number;
  sessions: WorkoutSession[];
  macros: { proteinG: number; carbsG: number; fatG: number };
}

export interface MealChecklistItem {
  kind: 'meal';
  template: SavedMeal;
  checked: boolean;
  mealIds: number[];
  /** Today's effective macros: the logged meal's if checked, else the template's. */
  todayProteinG: number;
  todayCarbsG: number;
  todayFatG: number;
}

export interface WorkoutChecklistItem {
  kind: 'workout';
  template: WorkoutTemplate;
  checked: boolean;
  sessionId: number | null;
}

export function useChecklist() {
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [todaySessions, setTodaySessions] = useState<WorkoutSessionWithSets[]>([]);
  const [todaySleepId, setTodaySleepId] = useState<number | null>(null);
  const [sleepHours, setSleepHoursState] = useState(DEFAULT_SLEEP_HOURS);
  const sleptToday = todaySleepId != null;
  const [streak, setStreak] = useState(0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<WeekDayWorkouts[]>([]);
  const [loading, setLoading] = useState(true);
  const { weights } = useProgressWeights();

  const refresh = useCallback(async () => {
    setLoading(true);
    const today = todayFn();

    const [meals, templates, dayMeals, daySessions, daySleep, recentMeals, allSessions, sleepDays, nutritionStats] =
      await Promise.all([
        getSavedMeals(),
        getWorkoutTemplates(),
        getMealsByDate(today),
        getSessionsByDate(today),
        getSleepSessionsByDate(today),
        getRecentMeals(500),
        getSessions(),
        getSleepDaySummaries(HISTORY_DAYS),
        getNutritionStats(),
      ]);
    const restDay = nutritionStats.restDayOfWeek;

    setSavedMeals(meals);
    setWorkoutTemplates(templates);
    setTodayMeals(dayMeals);
    setTodaySessions(daySessions);
    if (daySleep.length > 0) {
      setTodaySleepId(daySleep[0].id);
      setSleepHoursState(daySleep[0].hours);
    } else {
      setTodaySleepId(null);
    }

    // Historical completion, checked against the *current* template list —
    // a template added today reads as "missing" on past days, same as any
    // habit tracker whose checklist changes over time.
    const sleepHoursByDate = new Map(sleepDays.map((s) => [s.date, s.hours]));
    const dayScores: { totalPct: number }[] = [];
    for (let i = 0; i < HISTORY_DAYS; i++) {
      const date = addDays(today, -i);
      const checkedMeals = new Set(
        recentMeals.filter((m) => m.date === date && m.savedMealId != null).map((m) => m.savedMealId)
      ).size;
      const sessionsThatDay = allSessions.filter((s) => s.date === date);
      const pct = computeDayPct(
        {
          mealTemplatesCount: meals.length,
          checkedMeals,
          workout: deriveWorkoutSignals(sessionsThatDay, parseDate(date).getDay(), restDay),
          sleepHours: sleepHoursByDate.get(date) ?? null,
        },
        weights
      );
      dayScores.push({ totalPct: pct });
    }
    setStreak(computeStreak(dayScores));

    // Rolling 7 days ending today (not a fixed Sun-Sat grid), oldest first.
    const week: WeekDayWorkouts[] = [];
    for (let i = WEEK_DAYS - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      const dayMeals = recentMeals.filter((m) => m.date === date);
      const macros = dayMeals.reduce(
        (acc, m) => ({
          proteinG: acc.proteinG + m.proteinG,
          carbsG: acc.carbsG + m.carbsG,
          fatG: acc.fatG + m.fatG,
        }),
        { proteinG: 0, carbsG: 0, fatG: 0 }
      );
      week.push({
        date,
        weekday: parseDate(date).getDay(),
        sessions: allSessions.filter((s) => s.date === date),
        macros,
      });
    }
    setWeeklyWorkouts(week);

    setLoading(false);
  }, [weights]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mealItems: MealChecklistItem[] = savedMeals.map((template) => {
    const matches = todayMeals.filter((m) => m.savedMealId === template.id);
    const checked = matches.length > 0;
    return {
      kind: 'meal',
      template,
      checked,
      mealIds: matches.map((m) => m.id),
      todayProteinG: checked ? matches[0].proteinG : template.proteinG,
      todayCarbsG: checked ? matches[0].carbsG : template.carbsG,
      todayFatG: checked ? matches[0].fatG : template.fatG,
    };
  });

  const workoutItems: WorkoutChecklistItem[] = workoutTemplates.map((template) => {
    const match = todaySessions.find((s) => s.templateId === template.id);
    return { kind: 'workout', template, checked: !!match, sessionId: match?.id ?? null };
  });

  const totalItems = mealItems.length + workoutItems.length + 1;
  const checkedItems =
    mealItems.filter((m) => m.checked).length + workoutItems.filter((w) => w.checked).length + (sleptToday ? 1 : 0);
  const pct = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  // Live macro totals from whichever meals are checked off so far today.
  const macroTotals = todayMeals.reduce(
    (acc, m) => ({
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { proteinG: 0, carbsG: 0, fatG: 0 }
  );

  async function toggleMeal(item: MealChecklistItem) {
    if (item.checked) {
      await Promise.all(item.mealIds.map((id) => deleteMeal(id)));
    } else {
      await addMeal({
        date: todayFn(),
        time: nowTime(),
        name: item.template.name,
        proteinG: item.template.proteinG,
        carbsG: item.template.carbsG,
        fatG: item.template.fatG,
        items: item.template.items,
        savedMealId: item.template.id,
      });
    }
    await refresh();
  }

  /**
   * Overrides just today's macros for this meal — the recurring template in
   * Settings is untouched, so tomorrow reverts to the template's values. If
   * the meal isn't checked off yet, this both logs and checks it off today
   * with the given numbers.
   */
  async function editMealToday(
    item: MealChecklistItem,
    macros: { proteinG: number; carbsG: number; fatG: number }
  ) {
    if (item.checked && item.mealIds.length > 0) {
      const existing = todayMeals.find((m) => m.id === item.mealIds[0]);
      if (existing) {
        await updateMeal(existing.id, {
          date: existing.date,
          time: existing.time,
          name: existing.name,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          items: existing.items,
          savedMealId: existing.savedMealId,
        });
      }
    } else {
      await addMeal({
        date: todayFn(),
        time: nowTime(),
        name: item.template.name,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        items: item.template.items,
        savedMealId: item.template.id,
      });
    }
    await refresh();
  }

  async function toggleWorkout(item: WorkoutChecklistItem) {
    if (item.checked && item.sessionId != null) {
      await deleteSession(item.sessionId);
    } else {
      await createSession({
        date: todayFn(),
        notes: null,
        intensity: 'moderate',
        workoutType: item.template.workoutType,
        muscleGroups: item.template.muscleGroups,
        avgHeartRate: null,
        maxHeartRate: null,
        distanceKm: null,
        durationMinutes: null,
        elevationM: null,
        sets: [],
        templateId: item.template.id,
      });
    }
    await refresh();
  }

  async function toggleSleep() {
    if (sleptToday) {
      const sessions = await getSleepSessionsByDate(todayFn());
      await Promise.all(sessions.map((s) => deleteSleepSession(s.id)));
    } else {
      await addSleepSession({
        date: todayFn(),
        kind: 'night',
        hours: sleepHours,
        quality: 4,
      });
    }
    await refresh();
  }

  /** Adjusts the hours shown on the stepper; persists immediately if already checked off. */
  async function setSleepHours(hours: number) {
    const clamped = Math.max(1, Math.min(10, hours));
    setSleepHoursState(clamped);
    if (todaySleepId != null) {
      await updateSleepSession(todaySleepId, { date: todayFn(), kind: 'night', hours: clamped, quality: 4 });
      await refresh();
    }
  }

  return {
    loading,
    mealItems,
    workoutItems,
    sleptToday,
    sleepHours,
    setSleepHours,
    pct,
    streak,
    weeklyWorkouts,
    macroTotals,
    toggleMeal,
    editMealToday,
    toggleWorkout,
    toggleSleep,
    refresh,
  };
}
