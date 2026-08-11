import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Row, Screen, SectionTitle } from '../../../src/components/ui';
import { colors, spacing } from '../../../src/components/theme';
import { deleteSession, getSessionWithSets } from '../../../src/db/queries/workouts';
import { WORKOUT_INTENSITY_TIERS, muscleLabel } from '../../../src/domain/workoutTypes';
import {
  estimateCalories,
  formatDistance,
  formatDuration,
  formatPace,
  getDistanceConfig,
} from '../../../src/domain/cardio';
import { useProfile } from '../../../src/hooks/useProfile';
import type { WorkoutSessionWithSets, WorkoutSet } from '../../../src/types';

function intensityLabel(intensity: WorkoutSessionWithSets['intensity']): string {
  return WORKOUT_INTENSITY_TIERS.find((t) => t.value === intensity)?.label ?? intensity;
}

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useProfile();
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
        <Text style={{ color: colors.muted, textAlign: 'right' }}>האימון לא נמצא</Text>
      </Screen>
    );
  }

  const muscles =
    session.muscleGroups.length > 0
      ? session.muscleGroups
      : Array.from(new Set(session.sets.map((s) => s.muscleGroup))).filter(Boolean);

  return (
    <Screen>
      <SectionTitle>{session.workoutType}</SectionTitle>
      <Text style={{ color: colors.muted, textAlign: 'right' }}>
        {session.date} · עצימות {intensityLabel(session.intensity)}
      </Text>
      {(session.avgHeartRate || session.maxHeartRate) && (
        <Text style={{ color: colors.muted, textAlign: 'right' }}>
          {session.avgHeartRate ? `דופק ממוצע ${Math.round(session.avgHeartRate)}` : ''}
          {session.avgHeartRate && session.maxHeartRate ? ' · ' : ''}
          {session.maxHeartRate ? `דופק מקסימלי ${Math.round(session.maxHeartRate)}` : ''}
        </Text>
      )}
      {session.notes ? (
        <Text style={{ color: colors.muted, textAlign: 'right' }}>{session.notes}</Text>
      ) : null}

      {(session.distanceKm != null || session.durationMinutes != null) && (
        <Card>
          <SectionTitle>נתוני המאמץ</SectionTitle>
          {session.distanceKm != null && (
            <Row>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {formatDistance(session.distanceKm, session.workoutType)}
              </Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>מרחק</Text>
            </Row>
          )}
          {formatDuration(session.durationMinutes) && (
            <Row>
              <Text style={{ color: colors.text }}>{formatDuration(session.durationMinutes)}</Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>משך</Text>
            </Row>
          )}
          {(() => {
            const config = getDistanceConfig(session.workoutType);
            if (!config) return null;
            const pace = formatPace(session.distanceKm, session.durationMinutes, config.paceKind);
            if (!pace) return null;
            return (
              <Row>
                <Text style={{ color: colors.accentText, fontWeight: '700' }}>{pace}</Text>
                <Text style={{ color: colors.muted, textAlign: 'right' }}>{config.paceLabel}</Text>
              </Row>
            );
          })()}
          {session.elevationM ? (
            <Row>
              <Text style={{ color: colors.text }}>{Math.round(session.elevationM)} מ׳</Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>עלייה מצטברת</Text>
            </Row>
          ) : null}
          {estimateCalories(
            session.workoutType,
            session.intensity,
            session.durationMinutes,
            profile?.weightKg ?? null
          ) && (
            <Row>
              <Text style={{ color: colors.text }}>
                {estimateCalories(
                  session.workoutType,
                  session.intensity,
                  session.durationMinutes,
                  profile?.weightKg ?? null
                )}{' '}
                קק״ל
              </Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>שריפה משוערת</Text>
            </Row>
          )}
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
                    {muscleLabel(muscle)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    {Object.keys(byExercise).length} תרגילים · {sets.length} סטים
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
                  <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'right' }}>
                    {exerciseName}
                  </Text>
                  {exerciseSets.map((s) => (
                    <Row key={s.id}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>סט {s.setNumber}</Text>
                      <Text style={{ color: colors.text }}>
                        {s.weightKg} ק״ג × {s.reps} חזרות
                      </Text>
                    </Row>
                  ))}
                </View>
              ))}

            {open && sets.length === 0 && (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
                לא נרשמו תרגילים לשריר הזה
              </Text>
            )}
          </Card>
        );
      })}

      <Button title="מחק אימון" variant="danger" onPress={handleDelete} />
    </Screen>
  );
}
