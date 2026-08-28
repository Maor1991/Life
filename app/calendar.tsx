import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card, Row, Screen, SectionTitle } from '../src/components/ui';
import { colors } from '../src/components/theme';
import { useLanguage } from '../src/hooks/useLanguage';
import { getRecentMeals, getSavedMeals } from '../src/db/queries/nutrition';
import { getSessions } from '../src/db/queries/workouts';
import { getSleepDaySummaries } from '../src/db/queries/sleep';
import { getNutritionStats } from '../src/db/queries/nutritionGoal';
import { computeDayPct, deriveWorkoutSignals, isRestDay } from '../src/domain/dayCompletion';
import { useProgressWeights } from '../src/hooks/useProgressWeights';
import type { WorkoutSession } from '../src/types';
import { formatDate, today as todayFn } from '../src/domain/dates';

const MEALS_LIMIT = 3000;
const SLEEP_DAYS_LIMIT = 400;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Below 50% = red, 50-85% = orange, 85%+ = green with a checkmark. */
const RED = '#FF3B30';
const ORANGE = '#FF9500';

function dayColor(pct: number): string {
  if (pct >= 85) return colors.success;
  if (pct >= 50) return ORANGE;
  return RED;
}

function dayTint(pct: number): string {
  if (pct >= 85) return 'rgba(0,200,5,0.20)';
  if (pct >= 50) return 'rgba(255,149,0,0.18)';
  return 'rgba(255,59,48,0.18)';
}

interface MonthData {
  mealTemplatesCount: number;
  restDay: number | null;
  mealsByDate: Map<string, Set<number>>;
  sessionsByDate: Map<string, WorkoutSession[]>;
  sleepHoursByDate: Map<string, number>;
}

export default function CalendarScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { weights } = useProgressWeights();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [data, setData] = useState<MonthData | null>(null);

  const load = useCallback(async () => {
    const [meals, allSessions, recentMeals, sleepDays, stats] = await Promise.all([
      getSavedMeals(),
      getSessions(),
      getRecentMeals(MEALS_LIMIT),
      getSleepDaySummaries(SLEEP_DAYS_LIMIT),
      getNutritionStats(),
    ]);

    const mealsByDate = new Map<string, Set<number>>();
    recentMeals.forEach((m) => {
      if (m.savedMealId == null) return;
      if (!mealsByDate.has(m.date)) mealsByDate.set(m.date, new Set());
      mealsByDate.get(m.date)!.add(m.savedMealId);
    });

    const sessionsByDate = new Map<string, WorkoutSession[]>();
    allSessions.forEach((s) => {
      if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
      sessionsByDate.get(s.date)!.push(s);
    });

    setData({
      mealTemplatesCount: meals.length,
      restDay: stats.restDayOfWeek,
      mealsByDate,
      sessionsByDate,
      sleepHoursByDate: new Map(sleepDays.map((d) => [d.date, d.hours])),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(cursor.year, cursor.month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(formatDate(new Date(cursor.year, cursor.month, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    const result: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cursor]);

  function goPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }
  function goNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }

  const todayStr = todayFn();

  return (
    <Screen showLogo={false}>
      <Card>
        <Row>
          <Pressable onPress={goPrevMonth} hitSlop={10} style={styles.navButton}>
            <Text style={styles.navButtonText}>{t('calendar.prevMonth')}</Text>
          </Pressable>
          <SectionTitle>
            {t(`common.month.${cursor.month}`)} {cursor.year}
          </SectionTitle>
          <Pressable onPress={goNextMonth} hitSlop={10} style={styles.navButton}>
            <Text style={styles.navButtonText}>{t('calendar.nextMonth')}</Text>
          </Pressable>
        </Row>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{t(`common.weekdayInitial.${d}`)}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((date, di) => {
              if (!date || !data) {
                return <View key={di} style={styles.dayCell} />;
              }
              const isFuture = date > todayStr;
              const isToday = date === todayStr;
              const rest = isRestDay(di, data.restDay);
              const pct = isFuture
                ? null
                : computeDayPct(
                    {
                      mealTemplatesCount: data.mealTemplatesCount,
                      checkedMeals: data.mealsByDate.get(date)?.size ?? 0,
                      workout: deriveWorkoutSignals(data.sessionsByDate.get(date) ?? [], di, data.restDay),
                      sleepHours: data.sleepHoursByDate.get(date) ?? null,
                    },
                    weights
                  );
              const dayNum = Number(date.slice(8, 10));
              return (
                <Pressable
                  key={di}
                  disabled={isFuture}
                  onPress={() => router.push(`/day/${date}`)}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: pct != null ? dayTint(pct) : colors.card,
                      borderWidth: isToday ? 2 : 1,
                      borderColor: isToday ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {rest && <Text style={styles.restBadge}>🛌</Text>}
                  {pct != null && pct >= 85 && <Text style={styles.checkBadge}>✓</Text>}
                  <Text style={[styles.dayNumber, isFuture && { color: colors.muted }]}>{dayNum}</Text>
                  {pct != null && (
                    <Text style={[styles.dayPct, { color: dayColor(pct) }]}>{pct}%</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = {
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  navButtonText: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  weekRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 6,
  },
  weekdayText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  restBadge: {
    position: 'absolute' as const,
    top: 4,
    left: 4,
    fontSize: 9,
  },
  checkBadge: {
    position: 'absolute' as const,
    top: 3,
    right: 4,
    fontSize: 11,
    fontWeight: '800' as const,
    color: colors.success,
  },
  dayNumber: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  dayPct: {
    fontSize: 11,
    fontWeight: '700' as const,
    marginTop: 1,
  },
};
