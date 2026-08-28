import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { PillSelect } from './ui';
import { ProgressChart } from './ProgressChart';
import { TrendLineChart, lastDates, MAX_RANGE_DAYS } from './TrendLineChart';
import { useLanguage } from '../hooks/useLanguage';
import { getRecentMeals } from '../db/queries/nutrition';
import { getSleepDaySummaries } from '../db/queries/sleep';
import { getSessions } from '../db/queries/workouts';
import { getNutritionStats } from '../db/queries/nutritionGoal';
import { caloriesFromMacros } from '../domain/foods';
import { deriveWorkoutSignals, workoutDayScore } from '../domain/dayCompletion';
import { parseDate } from '../domain/dates';

const MEALS_LIMIT = 4000;
const SLEEP_DAYS_LIMIT = 400;

type Tab = 'progress' | 'nutrition' | 'sleep' | 'workouts';

/**
 * The four trend charts (overall progress, workouts, sleep, nutrition)
 * behind one tab switcher — shared between Home and the dedicated Trends
 * screen so both stay in sync without duplicating the data loading.
 */
export function ChartsSection() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('progress');

  const [caloriesByDate, setCaloriesByDate] = useState<Record<string, number>>({});
  const [sleepByDate, setSleepByDate] = useState<Record<string, number>>({});
  const [workoutPctByDate, setWorkoutPctByDate] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [meals, sleepDays, sessions, stats] = await Promise.all([
      getRecentMeals(MEALS_LIMIT),
      getSleepDaySummaries(SLEEP_DAYS_LIMIT),
      getSessions(),
      getNutritionStats(),
    ]);

    const cal: Record<string, number> = {};
    meals.forEach((m) => {
      cal[m.date] = (cal[m.date] ?? 0) + caloriesFromMacros(m);
    });
    setCaloriesByDate(cal);

    const sleep: Record<string, number> = {};
    sleepDays.forEach((s) => {
      sleep[s.date] = s.hours;
    });
    setSleepByDate(sleep);

    const sessionsByDate = new Map<string, { workoutType: string }[]>();
    sessions.forEach((s) => {
      if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
      sessionsByDate.get(s.date)!.push(s);
    });

    const workoutPct: Record<string, number> = {};
    for (const date of lastDates(MAX_RANGE_DAYS)) {
      const signals = deriveWorkoutSignals(sessionsByDate.get(date) ?? [], parseDate(date).getDay(), stats.restDayOfWeek);
      workoutPct[date] = workoutDayScore(signals);
    }
    setWorkoutPctByDate(workoutPct);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <>
      <PillSelect
        options={[
          { label: t('trends.progressTab'), value: 'progress' },
          { label: t('trends.workoutsTab'), value: 'workouts' },
          { label: t('trends.sleepTab'), value: 'sleep' },
          { label: t('trends.nutritionTab'), value: 'nutrition' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'progress' && <ProgressChart />}

      {tab === 'workouts' && (
        <TrendLineChart
          title={t('trends.workoutsChartTitle')}
          valuesByDate={workoutPctByDate}
          maxValue={100}
          suffix="%"
        />
      )}

      {tab === 'sleep' && (
        <TrendLineChart
          title={t('trends.sleepChartTitle')}
          valuesByDate={sleepByDate}
          maxValue={12}
          suffix={t('sleep.hoursShort')}
        />
      )}

      {tab === 'nutrition' && (
        <TrendLineChart
          title={t('trends.caloriesChartTitle')}
          valuesByDate={caloriesByDate}
          suffix={` ${t('nutrition.kcalShort')}`}
        />
      )}
    </>
  );
}
