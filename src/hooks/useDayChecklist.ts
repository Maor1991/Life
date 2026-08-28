import { useCallback, useEffect, useState } from 'react';
import { addMeal, deleteMeal, getMealsByDate, getSavedMeals, updateMeal } from '../db/queries/nutrition';
import {
  addSleepSession,
  deleteSleepSession,
  getSleepSessionsByDate,
  updateSleepSession,
} from '../db/queries/sleep';
import { createSession, deleteSession, getSessionsByDate } from '../db/queries/workouts';
import { getWorkoutTemplates } from '../db/queries/workoutTemplates';
import { nowTime } from '../components/TimePicker';
import type { Meal, SavedMeal, WorkoutSessionWithSets, WorkoutTemplate } from '../types';
import type { MealChecklistItem, WorkoutChecklistItem } from './useChecklist';

const DEFAULT_SLEEP_HOURS = 8;

/** Same checklist shape as useChecklist, but bound to an arbitrary date instead of today. */
export function useDayChecklist(date: string) {
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [daySessions, setDaySessions] = useState<WorkoutSessionWithSets[]>([]);
  const [daySleepId, setDaySleepId] = useState<number | null>(null);
  const [sleepHours, setSleepHoursState] = useState(DEFAULT_SLEEP_HOURS);
  // Until the user logs something, the day reads as a default full night —
  // an explicit 0-hour entry (from unchecking) is what shows as unchecked.
  const slept = daySleepId != null ? sleepHours > 0 : true;
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [meals, templates, mealsForDay, sessionsForDay, sleepForDay] = await Promise.all([
      getSavedMeals(),
      getWorkoutTemplates(),
      getMealsByDate(date),
      getSessionsByDate(date),
      getSleepSessionsByDate(date),
    ]);
    setSavedMeals(meals);
    setWorkoutTemplates(templates);
    setDayMeals(mealsForDay);
    setDaySessions(sessionsForDay);
    if (sleepForDay.length > 0) {
      setDaySleepId(sleepForDay[0].id);
      setSleepHoursState(sleepForDay[0].hours);
    } else {
      setDaySleepId(null);
      setSleepHoursState(DEFAULT_SLEEP_HOURS);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mealItems: MealChecklistItem[] = savedMeals.map((template) => {
    const matches = dayMeals.filter((m) => m.savedMealId === template.id);
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
    const match = daySessions.find((s) => s.templateId === template.id);
    return { kind: 'workout', template, checked: !!match, sessionId: match?.id ?? null };
  });

  /** Meals logged for this day that aren't tied to any template — one-off extras. */
  const extraMeals = dayMeals.filter((m) => m.savedMealId == null);

  /** Sessions logged for this day outside the template checklist — e.g. the Home week tracker's muscle/walk/day-off picks. */
  const extraSessions = daySessions.filter((s) => s.templateId == null);

  /** Live macro totals from every meal logged for this day (checked templates + extras). */
  const macroTotals = dayMeals.reduce(
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
        date,
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

  /** Overrides just this day's macros for the meal — the recurring template in Settings is untouched. */
  async function editMealDay(item: MealChecklistItem, macros: { proteinG: number; carbsG: number; fatG: number }) {
    if (item.checked && item.mealIds.length > 0) {
      const existing = dayMeals.find((m) => m.id === item.mealIds[0]);
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
        date,
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

  /** Logs a one-off meal for this day only — not tied to any recurring template. */
  async function addAdHocMeal(input: { name: string; proteinG: number; carbsG: number; fatG: number }) {
    await addMeal({
      date,
      time: nowTime(),
      name: input.name,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      items: [],
      savedMealId: null,
    });
    await refresh();
  }

  async function removeMeal(mealId: number) {
    await deleteMeal(mealId);
    await refresh();
  }

  async function toggleWorkout(item: WorkoutChecklistItem) {
    if (item.checked && item.sessionId != null) {
      await deleteSession(item.sessionId);
    } else {
      await createSession({
        date,
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

  async function removeSession(sessionId: number) {
    await deleteSession(sessionId);
    await refresh();
  }

  /**
   * Unchecking records an explicit "didn't sleep" (0 hours) — distinct from
   * an untouched day, which reads as a default full night without needing a
   * row at all. Re-checking just removes that override, reverting to the
   * implicit default rather than writing 8 back out.
   */
  async function toggleSleep() {
    if (slept) {
      if (daySleepId != null) {
        await updateSleepSession(daySleepId, { date, kind: 'night', hours: 0, quality: 1 });
      } else {
        await addSleepSession({ date, kind: 'night', hours: 0, quality: 1 });
      }
    } else if (daySleepId != null) {
      await deleteSleepSession(daySleepId);
    }
    await refresh();
  }

  /** Any deliberate change to the hours is itself the "different from default" signal, so it persists immediately. */
  async function setSleepHours(hours: number) {
    const clamped = Math.max(1, Math.min(12, hours));
    setSleepHoursState(clamped);
    if (daySleepId != null) {
      await updateSleepSession(daySleepId, { date, kind: 'night', hours: clamped, quality: 4 });
    } else {
      await addSleepSession({ date, kind: 'night', hours: clamped, quality: 4 });
    }
    await refresh();
  }

  return {
    loading,
    mealItems,
    workoutItems,
    extraMeals,
    extraSessions,
    macroTotals,
    slept,
    sleepHours,
    setSleepHours,
    toggleMeal,
    editMealDay,
    addAdHocMeal,
    removeMeal,
    toggleWorkout,
    removeSession,
    toggleSleep,
    refresh,
  };
}
