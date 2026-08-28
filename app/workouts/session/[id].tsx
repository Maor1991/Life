import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Row, Screen, SectionTitle } from '../../../src/components/ui';
import { colors, spacing } from '../../../src/components/theme';
import { useLanguage } from '../../../src/hooks/useLanguage';
import { deleteSession, getSessionWithSets } from '../../../src/db/queries/workouts';
import { muscleLabel, workoutIntensityLabel, workoutTypeLabel } from '../../../src/domain/workoutTypes';
import {
  formatDistance,
  formatDuration,
  formatPace,
  getDistanceConfig,
  paceFieldLabel,
} from '../../../src/domain/cardio';
import type { WorkoutSessionWithSets, WorkoutSet } from '../../../src/types';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const [session, setSession] = useState<WorkoutSessionWithSets | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMuscle, setOpenMuscle] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getSessionWithSets(Number(id));
    setSession(s);
    setOpenMuscle(s?.muscleGroups[0] ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDelete() {
    if (!session) return;
    await deleteSession(session.id);
    router.back();
  }

  if (loading) {
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

  if (!session) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, textAlign: align }}>{t('session.notFound')}</Text>
      </Screen>
    );
  }

  const muscles =
    session.muscleGroups.length > 0
      ? session.muscleGroups
      : Array.from(new Set(session.sets.map((s) => s.muscleGroup))).filter(Boolean);

  return (
    <Screen>
      <SectionTitle>{workoutTypeLabel(session.workoutType, t)}</SectionTitle>
      <Text style={{ color: colors.muted, textAlign: align }}>
        {t('session.intensityLine', { date: session.date, intensity: workoutIntensityLabel(session.intensity, t) })}
      </Text>
      {(session.avgHeartRate || session.maxHeartRate) && (
        <Text style={{ color: colors.muted, textAlign: align }}>
          {session.avgHeartRate ? t('session.avgHeartRateLine', { value: Math.round(session.avgHeartRate) }) : ''}
          {session.avgHeartRate && session.maxHeartRate ? ' · ' : ''}
          {session.maxHeartRate ? t('session.maxHeartRateLine', { value: Math.round(session.maxHeartRate) }) : ''}
        </Text>
      )}
      {session.notes ? (
        <Text style={{ color: colors.muted, textAlign: align }}>{session.notes}</Text>
      ) : null}

      {(session.distanceKm != null || session.durationMinutes != null) && (
        <Card>
          <SectionTitle>{t('session.effortData')}</SectionTitle>
          {session.distanceKm != null && (
            <Row>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {formatDistance(session.distanceKm, session.workoutType, t)}
              </Text>
              <Text style={{ color: colors.muted, textAlign: align }}>{t('session.distance')}</Text>
            </Row>
          )}
          {formatDuration(session.durationMinutes, t) && (
            <Row>
              <Text style={{ color: colors.text }}>{formatDuration(session.durationMinutes, t)}</Text>
              <Text style={{ color: colors.muted, textAlign: align }}>{t('session.duration')}</Text>
            </Row>
          )}
          {(() => {
            const config = getDistanceConfig(session.workoutType);
            if (!config) return null;
            const pace = formatPace(session.distanceKm, session.durationMinutes, config.paceKind, t);
            if (!pace) return null;
            return (
              <Row>
                <Text style={{ color: colors.accentText, fontWeight: '700' }}>{pace}</Text>
                <Text style={{ color: colors.muted, textAlign: align }}>{paceFieldLabel(config, t)}</Text>
              </Row>
            );
          })()}
          {session.elevationM ? (
            <Row>
              <Text style={{ color: colors.text }}>{Math.round(session.elevationM)} {t('cardio.mUnit')}</Text>
              <Text style={{ color: colors.muted, textAlign: align }}>{t('session.elevation')}</Text>
            </Row>
          ) : null}
        </Card>
      )}

      {muscles.map((muscle) => {
        const sets = session.sets.filter((s) => s.muscleGroup === muscle);
        const byExercise = sets.reduce<Record<string, WorkoutSet[]>>((acc, s) => {
          (acc[s.exerciseName] ??= []).push(s);
          return acc;
        }, {});
        const open = openMuscle === muscle;

        return (
          <Card key={muscle} style={{ gap: spacing.xs }}>
            <Pressable onPress={() => setOpenMuscle(open ? null : muscle)}>
              <Row>
                <Text style={{ color: colors.accentText, fontSize: 16 }}>{open ? '−' : '+'}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                    {muscleLabel(muscle, t)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    {t('session.exercisesAndSets', { exercises: Object.keys(byExercise).length, sets: sets.length })}
                  </Text>
                </View>
              </Row>
            </Pressable>

            {open &&
              Object.entries(byExercise).map(([exerciseName, exerciseSets]) => (
                <View
                  key={exerciseName}
                  style={{
                    backgroundColor: colors.cardAlt,
                    borderRadius: 8,
                    padding: spacing.sm,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '700', textAlign: align }}>
                    {exerciseName}
                  </Text>
                  {exerciseSets.map((s) => (
                    <Row key={s.id}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {t('session.setNumber', { number: s.setNumber })}
                      </Text>
                      <Text style={{ color: colors.text }}>
                        {t('session.repsLine', { weight: s.weightKg, reps: s.reps })}
                      </Text>
                    </Row>
                  ))}
                </View>
              ))}

            {open && sets.length === 0 && (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>
                {t('session.noExercisesForMuscle')}
              </Text>
            )}
          </Card>
        );
      })}

      <Button title={t('session.deleteWorkout')} variant="danger" onPress={handleDelete} />
    </Screen>
  );
}
