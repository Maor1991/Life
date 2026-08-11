import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Card, ProgressBar, Row, Screen, SectionTitle } from '../../src/components/ui';
import { MonthCalendar } from '../../src/components/MonthCalendar';
import { colors, scoreColor, scoreTextColor, spacing } from '../../src/components/theme';
import { useProfile } from '../../src/hooks/useProfile';
import { useScoreRange } from '../../src/hooks/useScoreRange';
import { useHomeData } from '../../src/hooks/useHomeData';
import { addDays, today as todayFn } from '../../src/domain/dates';
import { computeStreak } from '../../src/domain/scoring';
import { computeMacroTargets } from '../../src/domain/macros';
import { caloriesFromMacros, sumMacros } from '../../src/domain/foods';
import {
  computeMissingToday,
  computeMuscleBalance,
  computeWeekComparison,
} from '../../src/domain/homeInsights';
import { formatDateLabel } from '../../src/components/DateNavigator';
import { formatHours, sleepKindLabel } from '../../src/domain/sleepQuality';
import { formatDistance, formatDuration } from '../../src/domain/cardio';
import type { Meal } from '../../src/types';

const DOMAIN_LABELS: Record<'workoutPct' | 'sleepPct' | 'nutritionPct', string> = {
  workoutPct: 'אימונים',
  sleepPct: 'שינה',
  nutritionPct: 'תזונה',
};

const DOMAIN_ICONS: Record<'workout' | 'sleep' | 'nutrition', string> = {
  workout: '🏋️',
  sleep: '😴',
  nutrition: '🍽️',
};

function mealMacros(meals: Meal[]) {
  return sumMacros(
    meals.map((m) => ({ proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG }))
  );
}

export default function Home() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const today = todayFn();
  const rangeStart = useMemo(() => addDays(today, -89), [today]);

  const [selectedDate, setSelectedDate] = useState(today);
  const { scores, loading: scoresLoading, refresh: refreshScores } = useScoreRange(
    profile,
    rangeStart,
    today
  );
  const { data, refresh: refreshHome } = useHomeData(today, selectedDate);

  useFocusEffect(
    useCallback(() => {
      refreshScores();
      refreshHome();
    }, [refreshScores, refreshHome])
  );

  if (profileLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  const todayScore = scores.find((s) => s.date === today);
  const selectedScore = scores.find((s) => s.date === selectedDate);
  const streak = computeStreak([...scores].reverse());

  const macroTargets = computeMacroTargets(
    profile.heightCm,
    profile.weightKg,
    profile.age,
    profile.sex,
    profile.activityLevel
  );

  const todayMacros = mealMacros(data.todayMeals);
  const todaySleepHours = data.todaySleep.reduce((sum, s) => sum + s.hours, 0);

  const missing = computeMissingToday({
    profile,
    macroTargets,
    todayMacros,
    todaySleepHours,
    hasSleepLog: data.todaySleep.length > 0,
    workoutsThisWeek: data.workoutsThisWeek,
  });

  const muscleBalance = computeMuscleBalance(data.allSessions, today);
  // Only meaningful once at least one strength session exists.
  const hasStrengthHistory = muscleBalance.some((m) => m.lastDate !== null);
  const neglected = muscleBalance.filter((m) => m.daysSince === null || m.daysSince >= 7);
  const week = computeWeekComparison(data.allSessions, data.sleepSummaries, scores, today);

  const scoreByDate: Record<string, number> = {};
  for (const s of scores) scoreByDate[s.date] = s.totalPct;

  const dayMealMacros = mealMacros(data.dayMeals);
  const daySleepHours = data.daySleep.reduce((sum, s) => sum + s.hours, 0);

  return (
    <Screen>
      <Row>
        <SectionTitle>תמונת מצב יומית</SectionTitle>
        <View
          style={{
            backgroundColor: colors.cardAlt,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ color: colors.warning, fontWeight: '700' }}>🔥 {streak}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>ימים רצופים</Text>
        </View>
      </Row>

      {scoresLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Card>
          <Row>
            <Text style={{ color: colors.text, fontSize: 15, textAlign: 'right' }}>סה״כ היום</Text>
            <Text
              style={{
                color: scoreTextColor(todayScore?.totalPct ?? 0),
                fontSize: 28,
                fontWeight: '800',
              }}
            >
              {Math.round(todayScore?.totalPct ?? 0)}%
            </Text>
          </Row>
          {(['workoutPct', 'sleepPct', 'nutritionPct'] as const).map((key) => (
            <View key={key} style={{ gap: 4 }}>
              <Row>
                <Text style={{ color: colors.muted }}>{Math.round(todayScore?.[key] ?? 0)}%</Text>
                <Text style={{ color: colors.text, textAlign: 'right' }}>{DOMAIN_LABELS[key]}</Text>
              </Row>
              <ProgressBar
                pct={todayScore?.[key] ?? 0}
                color={scoreColor(todayScore?.[key] ?? 0)}
              />
            </View>
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle>מה חסר לי היום</SectionTitle>
        {missing.map((item) => (
          <Row key={item.domain} style={{ alignItems: 'flex-start', gap: spacing.sm }}>
            <Text style={{ fontSize: 16 }}>{item.done ? '✅' : DOMAIN_ICONS[item.domain]}</Text>
            <Text
              style={{
                color: item.done ? colors.muted : colors.text,
                fontSize: 13,
                textAlign: 'right',
                flex: 1,
                lineHeight: 19,
              }}
            >
              {item.text}
            </Text>
          </Row>
        ))}
      </Card>

      <Card>
        <SectionTitle>השבוע מול שבוע שעבר</SectionTitle>
        <ComparisonRow
          label="אימונים"
          current={week.thisWeek.workouts}
          previous={week.lastWeek.workouts}
          format={(v) => String(Math.round(v))}
        />
        <ComparisonRow
          label="שינה בממוצע"
          current={week.thisWeek.avgSleepHours}
          previous={week.lastWeek.avgSleepHours}
          format={(v) => `${v.toFixed(1)} שע׳`}
        />
        <ComparisonRow
          label="ציון יומי ממוצע"
          current={week.thisWeek.avgScore}
          previous={week.lastWeek.avgScore}
          format={(v) => `${Math.round(v)}%`}
        />
      </Card>

      {hasStrengthHistory && (
        <Card>
          <SectionTitle>מאזן שרירים</SectionTitle>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
            כמה פעמים אימנת כל שריר ב-30 הימים האחרונים
          </Text>

          {neglected.length > 0 && (
            <View
              style={{
                backgroundColor: colors.cardAlt,
                borderRadius: 10,
                padding: spacing.sm,
                borderWidth: 1,
                borderColor: colors.warning,
              }}
            >
              <Text style={{ color: colors.warning, fontSize: 13, textAlign: 'right' }}>
                {neglected
                  .slice(0, 3)
                  .map((m) =>
                    m.daysSince === null
                      ? `${m.label} — עוד לא אימנת`
                      : `${m.label} — לפני ${m.daysSince} ימים`
                  )
                  .join(' · ')}
              </Text>
            </View>
          )}

          {muscleBalance.map((m) => (
            <Row key={m.muscle}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {m.daysSince === null
                  ? 'לא אומן'
                  : m.daysSince === 0
                    ? 'היום'
                    : `לפני ${m.daysSince} ימים`}
              </Text>
              <Text style={{ color: colors.text, textAlign: 'right' }}>
                {m.label} · {m.sessions30d}
              </Text>
            </Row>
          ))}
        </Card>
      )}

      <Card>
        <MonthCalendar
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          scores={scoreByDate}
          maxDate={today}
        />
      </Card>

      <Card>
        <Row>
          <Text
            style={{
              color: scoreTextColor(selectedScore?.totalPct ?? 0),
              fontSize: 20,
              fontWeight: '800',
            }}
          >
            {Math.round(selectedScore?.totalPct ?? 0)}%
          </Text>
          <SectionTitle>{formatDateLabel(selectedDate)}</SectionTitle>
        </Row>

        <DaySection title="אימונים" emoji="🏋️">
          {data.dayWorkouts.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
              לא היה אימון ביום זה
            </Text>
          ) : (
            data.dayWorkouts.map((w) => (
              <Pressable key={w.id} onPress={() => router.push(`/workouts/session/${w.id}`)}>
                <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right' }}>
                  {w.workoutType}
                  {w.distanceKm != null
                    ? ` · ${formatDistance(w.distanceKm, w.workoutType)}`
                    : ''}
                  {formatDuration(w.durationMinutes) ? ` · ${formatDuration(w.durationMinutes)}` : ''}
                  {w.sets.length > 0 ? ` · ${w.sets.length} סטים` : ''}
                </Text>
              </Pressable>
            ))
          )}
        </DaySection>

        <DaySection title="שינה" emoji="😴">
          {data.daySleep.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
              לא נרשמה שינה ביום זה
            </Text>
          ) : (
            <>
              <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right' }}>
                סה״כ {formatHours(daySleepHours)}
              </Text>
              {data.daySleep.map((s) => (
                <Text
                  key={s.id}
                  style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}
                >
                  {sleepKindLabel(s.kind)} · {formatHours(s.hours)} · איכות {s.quality}
                </Text>
              ))}
            </>
          )}
        </DaySection>

        <DaySection title="תזונה" emoji="🍽️">
          {data.dayMeals.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
              לא נרשמו ארוחות ביום זה
            </Text>
          ) : (
            <>
              <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right' }}>
                {Math.round(caloriesFromMacros(dayMealMacros))} קק״ל · ח{' '}
                {Math.round(dayMealMacros.proteinG)} · פ {Math.round(dayMealMacros.carbsG)} · ש{' '}
                {Math.round(dayMealMacros.fatG)}
              </Text>
              {data.dayMeals.map((m) => (
                <Text
                  key={m.id}
                  style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}
                >
                  {m.time} · {m.name}
                </Text>
              ))}
            </>
          )}
        </DaySection>
      </Card>
    </Screen>
  );
}

function DaySection({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        gap: 4,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
        {emoji} {title}
      </Text>
      {children}
    </View>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
  format,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  format: (value: number) => string;
}) {
  const delta = current != null && previous != null ? current - previous : null;
  const deltaColor =
    delta == null || Math.abs(delta) < 0.05
      ? colors.muted
      : delta > 0
        ? colors.success
        : colors.danger;
  const deltaText =
    delta == null
      ? '—'
      : Math.abs(delta) < 0.05
        ? 'ללא שינוי'
        : `${delta > 0 ? '+' : '−'}${format(Math.abs(delta))}`;

  return (
    <Row>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <Text style={{ color: deltaColor, fontSize: 12 }}>{deltaText}</Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>
          {current != null ? format(current) : '—'}
        </Text>
      </View>
      <Text style={{ color: colors.muted, textAlign: 'right' }}>{label}</Text>
    </Row>
  );
}
