import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, Row, SectionTitle } from './ui';
import { colors, spacing } from './theme';
import { useLanguage } from '../hooks/useLanguage';
import { parseDate, today as todayFn } from '../domain/dates';
import { muscleLabel } from '../domain/workoutTypes';
import { computeMuscleBalance, type MuscleBalanceEntry } from '../domain/muscleBalance';
import { getSessions } from '../db/queries/workouts';
import type { WorkoutSession } from '../types';

const NARROW_WINDOW_DAYS = 14;
const WIDE_WINDOW_DAYS = 30;
/** Below this many days of actual logged workout history, 30 days is mostly empty days, so the balance reads as noise rather than signal. */
const WIDE_WINDOW_USAGE_DAYS = 60;

function daysSince(date: string, today: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(today).getTime() - parseDate(date).getTime()) / msPerDay);
}

/** Which muscles have gone quiet lately, most-neglected first — nudges toward balance instead of favorite muscles. */
export function MuscleBalanceCard() {
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const [entries, setEntries] = useState<MuscleBalanceEntry[]>([]);
  const [windowDays, setWindowDays] = useState(NARROW_WINDOW_DAYS);

  useFocusEffect(
    useCallback(() => {
      getSessions().then((sessions: WorkoutSession[]) => {
        const today = todayFn();
        // "Usage" is measured from the earliest logged workout, not account
        // age — an account that sat dormant for months (paused project,
        // long gap before first real use) shouldn't jump straight to the
        // wide window just because it's old.
        const firstLoggedDate = sessions.reduce<string | null>(
          (earliest, s) => (earliest == null || s.date < earliest ? s.date : earliest),
          null
        );
        const usageDays = firstLoggedDate ? daysSince(firstLoggedDate, today) : 0;
        const window = usageDays >= WIDE_WINDOW_USAGE_DAYS ? WIDE_WINDOW_DAYS : NARROW_WINDOW_DAYS;
        setWindowDays(window);
        setEntries(computeMuscleBalance(sessions, today, window));
      });
    }, [])
  );

  if (entries.length === 0) return null;

  return (
    <Card>
      <SectionTitle>{t('home.muscleBalance')}</SectionTitle>
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>
        {t('home.muscleBalance.subtitle', { days: windowDays })}
      </Text>

      {entries.map((entry) => {
        const label = muscleLabel(entry.muscle, t);
        const recency =
          entry.daysSince == null
            ? t('home.muscleBalance.neverTrained', { muscle: label })
            : entry.daysSince === 0
              ? `${label} — ${t('home.muscleBalance.today')}`
              : t('home.muscleBalance.daysAgo', { muscle: label, days: entry.daysSince });

        return (
          <Row key={entry.muscle} style={{ paddingVertical: 4 }}>
            <View
              style={{
                minWidth: 28,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: colors.cardAlt,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{entry.sessionsInWindow}×</Text>
            </View>
            <Text
              style={{
                color: entry.daysSince == null || entry.daysSince >= 10 ? colors.warning : colors.text,
                fontSize: 13,
                textAlign: align,
              }}
            >
              {recency}
            </Text>
          </Row>
        );
      })}
    </Card>
  );
}
