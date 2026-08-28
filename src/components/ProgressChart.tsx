import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from 'expo-router';
import { Row } from './ui';
import { TrendLineChart, lastDates, MAX_RANGE_DAYS } from './TrendLineChart';
import { colors, spacing } from './theme';
import { useLanguage } from '../hooks/useLanguage';
import { computeDayPct, deriveWorkoutSignals, rebalanceWeights, type ProgressWeights } from '../domain/dayCompletion';
import { useProgressWeights } from '../hooks/useProgressWeights';
import { getRecentMeals, getSavedMeals } from '../db/queries/nutrition';
import { getSleepDaySummaries } from '../db/queries/sleep';
import { getSessions } from '../db/queries/workouts';
import { getNutritionStats } from '../db/queries/nutritionGoal';
import { parseDate } from '../domain/dates';

const MEALS_LIMIT = 4000;
const SLEEP_DAYS_LIMIT = 400;

/**
 * "Stock chart" style overview: the same weighted daily score used by the
 * calendar and streak (workouts + sleep + nutrition combined), plus the
 * user-adjustable weight sliders for that formula.
 */
export function ProgressChart() {
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const { weights, setWeights } = useProgressWeights();
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [progressByDate, setProgressByDate] = useState<Record<string, number>>({});

  function adjustWeight(key: keyof ProgressWeights, value: number) {
    setWeights(rebalanceWeights(weights, key, value));
  }

  const load = useCallback(async () => {
    const [meals, sleepDays, sessions, savedMeals, stats] = await Promise.all([
      getRecentMeals(MEALS_LIMIT),
      getSleepDaySummaries(SLEEP_DAYS_LIMIT),
      getSessions(),
      getSavedMeals(),
      getNutritionStats(),
    ]);

    const sleepHoursByDate = new Map(sleepDays.map((s) => [s.date, s.hours]));

    const mealsByDate = new Map<string, Set<number>>();
    meals.forEach((m) => {
      if (m.savedMealId == null) return;
      if (!mealsByDate.has(m.date)) mealsByDate.set(m.date, new Set());
      mealsByDate.get(m.date)!.add(m.savedMealId);
    });

    const sessionsByDate = new Map<string, { workoutType: string }[]>();
    sessions.forEach((s) => {
      if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
      sessionsByDate.get(s.date)!.push(s);
    });

    const progress: Record<string, number> = {};
    for (const date of lastDates(MAX_RANGE_DAYS)) {
      progress[date] = computeDayPct(
        {
          mealTemplatesCount: savedMeals.length,
          checkedMeals: mealsByDate.get(date)?.size ?? 0,
          workout: deriveWorkoutSignals(
            sessionsByDate.get(date) ?? [],
            parseDate(date).getDay(),
            stats.restDayOfWeek
          ),
          sleepHours: sleepHoursByDate.get(date) ?? null,
        },
        weights
      );
    }
    setProgressByDate(progress);
  }, [weights]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <TrendLineChart
      title={t('trends.progressChartTitle')}
      subtitle={t('trends.progressSubtitle')}
      valuesByDate={progressByDate}
      maxValue={100}
      suffix="%"
      footer={
        <>
          <Pressable onPress={() => setWeightsOpen((v) => !v)} style={{ paddingTop: spacing.xs }}>
            <Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '700', textAlign: align }}>
              {weightsOpen ? '−' : '+'} {t('trends.customizeWeights')}
            </Text>
          </Pressable>

          {weightsOpen && (
            <View style={{ gap: spacing.xs, paddingTop: spacing.xs }}>
              <WeightSlider
                label={t('trends.workoutsTab')}
                value={weights.workout}
                onChange={(v) => adjustWeight('workout', v)}
                align={align}
              />
              <WeightSlider
                label={t('trends.sleepTab')}
                value={weights.sleep}
                onChange={(v) => adjustWeight('sleep', v)}
                align={align}
              />
              <WeightSlider
                label={t('trends.nutritionTab')}
                value={weights.nutrition}
                onChange={(v) => adjustWeight('nutrition', v)}
                align={align}
              />
            </View>
          )}
        </>
      }
    />
  );
}

function WeightSlider({
  label,
  value,
  onChange,
  align,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  align: 'left' | 'right';
}) {
  return (
    <View>
      <Row>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{Math.round(value * 100)}%</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>{label}</Text>
      </Row>
      <Slider
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
    </View>
  );
}
