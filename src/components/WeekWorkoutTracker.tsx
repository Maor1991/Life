import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button, Card, ChecklistRow, Row } from './ui';
import { colors, scoreColor, shadows, spacing, typography } from './theme';
import { useLanguage } from '../hooks/useLanguage';
import { addDays, parseDate, today as todayFn } from '../domain/dates';
import {
  GYM_TYPE,
  REST_TYPE,
  WALK_TYPE,
  getQuickMuscleOptions,
  quickMuscleFromGroups,
  quickMuscleGroups,
  quickMuscleLabel,
  type QuickMuscle,
} from '../domain/workoutTypes';
import { workoutDayScore } from '../domain/dayCompletion';
import { createSession, deleteSession, getSessionsByDate, updateSession, type NewSession } from '../db/queries/workouts';
import type { WorkoutSessionWithSets } from '../types';

const DEFAULT_WALK_KM = 3;
const KM_STEP = 0.5;
const QUICK_MUSCLE_COUNT = 5;

/** Badge shown per day; null means nothing to show yet. Delegates to the shared daily score's workout formula. */
function dayScorePct(hasMuscle: boolean, hasWalk: boolean, hasRest: boolean): number | null {
  if (!hasMuscle && !hasWalk && !hasRest) return null;
  return workoutDayScore({ trained: hasMuscle, walked: hasWalk, restDay: hasRest });
}

/** A session this widget can safely own and rewrite: no logged sets, so it never collides with a detailed workout logged elsewhere. */
function findMuscleSession(sessions: WorkoutSessionWithSets[]): WorkoutSessionWithSets | undefined {
  return sessions.find(
    (s) => s.workoutType === GYM_TYPE && s.sets.length === 0 && quickMuscleFromGroups(s.muscleGroups) != null
  );
}

function findRestSession(sessions: WorkoutSessionWithSets[]): WorkoutSessionWithSets | undefined {
  return sessions.find((s) => s.workoutType === REST_TYPE && s.sets.length === 0);
}

function findWalkSession(sessions: WorkoutSessionWithSets[]): WorkoutSessionWithSets | undefined {
  return sessions.find((s) => s.workoutType === WALK_TYPE && s.sets.length === 0);
}

function baseSession(date: string, overrides: Partial<NewSession>): NewSession {
  return {
    date,
    notes: null,
    intensity: 'moderate',
    workoutType: GYM_TYPE,
    muscleGroups: [],
    avgHeartRate: null,
    maxHeartRate: null,
    distanceKm: null,
    durationMinutes: null,
    elevationM: null,
    sets: [],
    templateId: null,
    ...overrides,
  };
}

function sessionOverrides(existing: WorkoutSessionWithSets, overrides: Partial<NewSession>): NewSession {
  return baseSession(existing.date, {
    notes: existing.notes,
    intensity: existing.intensity,
    workoutType: existing.workoutType,
    muscleGroups: existing.muscleGroups,
    avgHeartRate: existing.avgHeartRate,
    maxHeartRate: existing.maxHeartRate,
    distanceKm: existing.distanceKm,
    durationMinutes: existing.durationMinutes,
    elevationM: existing.elevationM,
    templateId: existing.templateId,
    ...overrides,
  });
}

/**
 * Below Sleep on Home: seven day squares for the current Sun-Sat week. Each
 * day can carry one quick muscle-group pick and a walking distance — both
 * back real workout_sessions rows, so they count toward the streak and the
 * calendar the same as any other logged workout.
 */
export function WeekWorkoutTracker({ onChange }: { onChange?: () => void }) {
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const muscleOptions = useMemo(() => getQuickMuscleOptions(t), [t]);

  const today = todayFn();
  const weekDates = useMemo(() => {
    const weekday = parseDate(today).getDay();
    const sunday = addDays(today, -weekday);
    return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  }, [today]);

  const [sessionsByDate, setSessionsByDate] = useState<Record<string, WorkoutSessionWithSets[]>>({});
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const loadWeek = useCallback(async () => {
    const results = await Promise.all(weekDates.map((d) => getSessionsByDate(d)));
    const next: Record<string, WorkoutSessionWithSets[]> = {};
    weekDates.forEach((d, i) => {
      next[d] = results[i];
    });
    setSessionsByDate(next);
  }, [weekDates]);

  useFocusEffect(
    useCallback(() => {
      loadWeek();
    }, [loadWeek])
  );

  async function refreshDate(date: string) {
    const sessions = await getSessionsByDate(date);
    setSessionsByDate((prev) => ({ ...prev, [date]: sessions }));
    onChange?.();
  }

  async function pickMuscle(date: string, muscle: QuickMuscle) {
    const sessions = sessionsByDate[date] ?? [];
    const existing = findMuscleSession(sessions);
    const existingRest = findRestSession(sessions);
    if (existingRest) await deleteSession(existingRest.id);
    if (existing && quickMuscleFromGroups(existing.muscleGroups) === muscle) {
      await deleteSession(existing.id);
    } else if (existing) {
      await updateSession(existing.id, sessionOverrides(existing, { muscleGroups: quickMuscleGroups(muscle) }));
    } else {
      await createSession(baseSession(date, { workoutType: GYM_TYPE, muscleGroups: quickMuscleGroups(muscle) }));
    }
    await refreshDate(date);
  }

  /** Mutually exclusive with a muscle pick — marking a day off clears any muscle already set, and vice versa. */
  async function pickRest(date: string) {
    const sessions = sessionsByDate[date] ?? [];
    const existingRest = findRestSession(sessions);
    if (existingRest) {
      await deleteSession(existingRest.id);
    } else {
      const existingMuscle = findMuscleSession(sessions);
      if (existingMuscle) await deleteSession(existingMuscle.id);
      await createSession(baseSession(date, { workoutType: REST_TYPE }));
    }
    await refreshDate(date);
  }

  async function toggleWalk(date: string) {
    const sessions = sessionsByDate[date] ?? [];
    const existing = findWalkSession(sessions);
    if (existing) {
      await deleteSession(existing.id);
    } else {
      await createSession(baseSession(date, { workoutType: WALK_TYPE, distanceKm: DEFAULT_WALK_KM }));
    }
    await refreshDate(date);
  }

  async function adjustWalkKm(date: string, delta: number) {
    const existing = findWalkSession(sessionsByDate[date] ?? []);
    if (!existing) return;
    const next = Math.max(0, Math.round(((existing.distanceKm ?? 0) + delta) * 2) / 2);
    await updateSession(existing.id, sessionOverrides(existing, { distanceKm: next }));
    await refreshDate(date);
  }

  const activeSessions = activeDate ? sessionsByDate[activeDate] ?? [] : [];
  const activeMuscleSession = findMuscleSession(activeSessions);
  const activeRestSession = findRestSession(activeSessions);
  const activeWalkSession = findWalkSession(activeSessions);
  const activeMusclePick = activeMuscleSession ? quickMuscleFromGroups(activeMuscleSession.muscleGroups) : null;

  /** Distinct quick muscles covered this week, any source — the user's "5 workouts, all muscles = 100%" weekly metric. */
  const weeklyMusclesCovered = useMemo(() => {
    const covered = new Set<QuickMuscle>();
    weekDates.forEach((d) => {
      (sessionsByDate[d] ?? []).forEach((s) => {
        const pick = quickMuscleFromGroups(s.muscleGroups);
        if (pick) covered.add(pick);
      });
    });
    return covered.size;
  }, [weekDates, sessionsByDate]);
  const weeklyCoveragePct = Math.round((weeklyMusclesCovered / QUICK_MUSCLE_COUNT) * 100);

  function dayModalTitle(date: string): string {
    const d = parseDate(date);
    return `${t(`common.weekday.${d.getDay()}`)}, ${d.getDate()} ${t(`common.month.${d.getMonth()}`)}`;
  }

  return (
    <Card>
      <View style={{ flexDirection: isRTL ? 'row' : 'row-reverse', gap: 6 }}>
        {weekDates.map((date) => {
          const weekday = parseDate(date).getDay();
          const isToday = date === today;
          const sessions = sessionsByDate[date] ?? [];
          const muscleSession = findMuscleSession(sessions);
          const musclePick = muscleSession ? quickMuscleFromGroups(muscleSession.muscleGroups) : null;
          const restSession = findRestSession(sessions);
          const walkSession = findWalkSession(sessions);
          const pct = dayScorePct(musclePick != null, walkSession != null, restSession != null);

          return (
            <Pressable
              key={date}
              onPress={() => setActiveDate(date)}
              style={{
                flex: 1,
                minHeight: 82,
                borderRadius: 12,
                paddingVertical: 8,
                paddingHorizontal: 2,
                alignItems: 'center',
                justifyContent: 'flex-start',
                backgroundColor: colors.cardAlt,
                borderWidth: isToday ? 2 : 1,
                borderColor: isToday ? colors.primary : colors.border,
              }}
            >
              {pct != null && (
                <Text
                  style={{
                    position: 'absolute',
                    top: 4,
                    color: scoreColor(pct),
                    fontSize: 9,
                    fontWeight: '800',
                  }}
                >
                  {pct}%
                </Text>
              )}
              <Text style={{ color: colors.muted, fontSize: 9, fontWeight: '600', marginTop: pct != null ? 10 : 0 }}>
                {t(`common.weekdayInitial.${weekday}`)}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 1 }}>
                {date.slice(8, 10)}.{date.slice(5, 7)}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: musclePick ? colors.text : colors.muted,
                  fontSize: 11,
                  fontWeight: musclePick ? '700' : '400',
                  fontStyle: restSession ? 'italic' : 'normal',
                  textAlign: 'center',
                  marginTop: 6,
                }}
              >
                {musclePick ? quickMuscleLabel(musclePick, t) : restSession ? t('weekTracker.dayOff') : '–'}
              </Text>
              {walkSession && (
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 6 }}>
                  🚶 {walkSession.distanceKm}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: colors.muted, fontSize: 11, textAlign: align }}>
        {t('weekTracker.weeklyCoverage', { covered: weeklyMusclesCovered, total: QUICK_MUSCLE_COUNT, pct: weeklyCoveragePct })}
      </Text>

      <Modal
        visible={activeDate != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDate(null)}
      >
        <Pressable
          onPress={() => setActiveDate(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: spacing.sm,
              ...shadows.raised,
            }}
          >
            {activeDate && (
              <>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, textAlign: align }}>
                  {dayModalTitle(activeDate)}
                </Text>

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {muscleOptions.map((opt) => {
                    const active = activeMusclePick === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => pickMuscle(activeDate, opt.value)}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: 999,
                          backgroundColor: active ? colors.primary : colors.card,
                          borderWidth: 1,
                          borderColor: active ? colors.primary : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            color: active ? colors.onPrimary : colors.muted,
                            fontSize: typography.caption,
                            fontWeight: active ? '700' : '400',
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => pickRest(activeDate)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: 999,
                      backgroundColor: activeRestSession ? colors.muted : colors.card,
                      borderWidth: 1,
                      borderColor: activeRestSession ? colors.muted : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: activeRestSession ? colors.onPrimary : colors.muted,
                        fontSize: typography.caption,
                        fontWeight: activeRestSession ? '700' : '400',
                      }}
                    >
                      {t('weekTracker.dayOff')}
                    </Text>
                  </Pressable>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

                <ChecklistRow
                  label={t('workoutType.walking')}
                  checked={activeWalkSession != null}
                  align={align}
                  onToggle={() => toggleWalk(activeDate)}
                  strikethrough={false}
                />

                {activeWalkSession && (
                  <Row style={{ justifyContent: 'center', gap: spacing.md }}>
                    <Pressable
                      onPress={() => adjustWalkKm(activeDate, -KM_STEP)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.cardAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>−</Text>
                    </Pressable>
                    <Text style={{ color: colors.text, fontSize: 18, minWidth: 70, textAlign: 'center' }}>
                      {activeWalkSession.distanceKm} {t('cardio.kmUnit')}
                    </Text>
                    <Pressable
                      onPress={() => adjustWalkKm(activeDate, KM_STEP)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.cardAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>+</Text>
                    </Pressable>
                  </Row>
                )}

                <Button title={t('common.close')} variant="secondary" onPress={() => setActiveDate(null)} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}
