import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Button,
  Card,
  Field,
  MultiPillSelect,
  PillSelect,
  Row,
  Screen,
  SectionTitle,
} from '../../../src/components/ui';
import { DateNavigator } from '../../../src/components/DateNavigator';
import { colors, spacing } from '../../../src/components/theme';
import {
  createSession,
  deleteSession,
  getExerciseNames,
  getExerciseNamesByMuscle,
  getSessionsByDate,
  updateSession,
  type NewSet,
} from '../../../src/db/queries/workouts';
import {
  GYM_TYPE,
  MUSCLE_GROUPS,
  WORKOUT_INTENSITY_TIERS,
  WORKOUT_TYPES,
  muscleLabel,
  type MuscleGroup,
} from '../../../src/domain/workoutTypes';
import {
  estimateCalories,
  formatDistance,
  formatDuration,
  formatPace,
  getActivityKind,
  getDistanceConfig,
} from '../../../src/domain/cardio';
import { useProfile } from '../../../src/hooks/useProfile';
import { today } from '../../../src/domain/dates';
import type { WorkoutIntensity, WorkoutSessionWithSets } from '../../../src/types';

interface DraftSet {
  weightKg: string;
  reps: string;
}

interface DraftExercise {
  name: string;
  sets: DraftSet[];
}

type DraftByMuscle = Record<string, DraftExercise[]>;

const INTENSITY_OPTIONS = WORKOUT_INTENSITY_TIERS.map((t) => ({
  label: t.label,
  value: t.value,
}));

function intensityLabel(intensity: WorkoutIntensity): string {
  return WORKOUT_INTENSITY_TIERS.find((t) => t.value === intensity)?.label ?? intensity;
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [date, setDate] = useState(today());
  const [sessions, setSessions] = useState<WorkoutSessionWithSets[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});

  const [workoutType, setWorkoutType] = useState<string>(GYM_TYPE);
  const [customType, setCustomType] = useState('');
  const [intensity, setIntensity] = useState<WorkoutIntensity>('moderate');
  const [avgHr, setAvgHr] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [notes, setNotes] = useState('');
  const [distance, setDistance] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [elevation, setElevation] = useState('');
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [draft, setDraft] = useState<DraftByMuscle>({});
  const [openMuscle, setOpenMuscle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const effectiveType = workoutType === 'אחר' ? customType.trim() || 'אחר' : workoutType;
  const activityKind = getActivityKind(effectiveType);
  const isGym = activityKind === 'gym';
  const distanceConfig = getDistanceConfig(effectiveType);

  // Distance is entered in the unit that suits the sport but stored in km.
  const distanceKm = (() => {
    if (!distanceConfig) return null;
    const value = parseFloat(distance);
    if (!Number.isFinite(value) || value <= 0) return null;
    return distanceConfig.distanceUnit === 'm' ? value / 1000 : value;
  })();
  const durationMinutes = parseFloat(durationMin) || null;
  const paceText = distanceConfig
    ? formatPace(distanceKm, durationMinutes, distanceConfig.paceKind)
    : null;
  const caloriesEstimate = estimateCalories(
    effectiveType,
    intensity,
    durationMinutes,
    profile?.weightKg ?? null
  );

  const load = useCallback(async () => {
    const [s, names] = await Promise.all([getSessionsByDate(date), getExerciseNames()]);
    setSessions(s);
    setExerciseNames(names);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      muscles.map(async (m) => [m, await getExerciseNamesByMuscle(m)] as const)
    ).then((pairs) => {
      if (cancelled) return;
      setSuggestions(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [muscles]);

  function toggleMuscle(muscle: MuscleGroup) {
    setMuscles((prev) => {
      const next = prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle];
      if (!prev.includes(muscle)) setOpenMuscle(muscle);
      return next;
    });
    setDraft((prev) => {
      if (prev[muscle]) return prev;
      return { ...prev, [muscle]: [] };
    });
  }

  function addExercise(muscle: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDraft((prev) => ({
      ...prev,
      [muscle]: [...(prev[muscle] ?? []), { name: trimmed, sets: [{ weightKg: '', reps: '' }] }],
    }));
  }

  function removeExercise(muscle: string, index: number) {
    setDraft((prev) => ({
      ...prev,
      [muscle]: (prev[muscle] ?? []).filter((_, i) => i !== index),
    }));
  }

  function addSet(muscle: string, exerciseIndex: number) {
    setDraft((prev) => ({
      ...prev,
      [muscle]: (prev[muscle] ?? []).map((ex, i) =>
        i === exerciseIndex ? { ...ex, sets: [...ex.sets, { weightKg: '', reps: '' }] } : ex
      ),
    }));
  }

  function removeSet(muscle: string, exerciseIndex: number, setIndex: number) {
    setDraft((prev) => ({
      ...prev,
      [muscle]: (prev[muscle] ?? []).map((ex, i) =>
        i === exerciseIndex ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) } : ex
      ),
    }));
  }

  function updateSet(
    muscle: string,
    exerciseIndex: number,
    setIndex: number,
    field: keyof DraftSet,
    value: string
  ) {
    setDraft((prev) => ({
      ...prev,
      [muscle]: (prev[muscle] ?? []).map((ex, i) =>
        i === exerciseIndex
          ? {
              ...ex,
              sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, [field]: value } : s)),
            }
          : ex
      ),
    }));
  }

  function resetForm() {
    setWorkoutType(GYM_TYPE);
    setCustomType('');
    setIntensity('moderate');
    setAvgHr('');
    setMaxHr('');
    setNotes('');
    setDistance('');
    setDurationMin('');
    setElevation('');
    setMuscles([]);
    setDraft({});
    setOpenMuscle(null);
    setEditingId(null);
  }

  function startEditing(session: WorkoutSessionWithSets) {
    setEditingId(session.id);
    const known = WORKOUT_TYPES.includes(session.workoutType);
    setWorkoutType(known ? session.workoutType : 'אחר');
    setCustomType(known ? '' : session.workoutType);
    setIntensity(session.intensity);
    setAvgHr(session.avgHeartRate != null ? String(session.avgHeartRate) : '');
    setMaxHr(session.maxHeartRate != null ? String(session.maxHeartRate) : '');
    setNotes(session.notes ?? '');

    const editedConfig = getDistanceConfig(session.workoutType);
    setDistance(
      session.distanceKm != null
        ? String(
            editedConfig?.distanceUnit === 'm'
              ? Math.round(session.distanceKm * 1000)
              : session.distanceKm
          )
        : ''
    );
    setDurationMin(session.durationMinutes != null ? String(session.durationMinutes) : '');
    setElevation(session.elevationM != null ? String(session.elevationM) : '');
    setMuscles(session.muscleGroups as MuscleGroup[]);

    const rebuilt: DraftByMuscle = {};
    for (const muscle of session.muscleGroups) rebuilt[muscle] = [];
    for (const set of session.sets) {
      const muscle = set.muscleGroup || 'other';
      rebuilt[muscle] ??= [];
      let exercise = rebuilt[muscle].find((e) => e.name === set.exerciseName);
      if (!exercise) {
        exercise = { name: set.exerciseName, sets: [] };
        rebuilt[muscle].push(exercise);
      }
      exercise.sets.push({ weightKg: String(set.weightKg), reps: String(set.reps) });
    }
    setDraft(rebuilt);
    setOpenMuscle(session.muscleGroups[0] ?? null);
  }

  function buildSets(): NewSet[] {
    const result: NewSet[] = [];
    for (const muscle of Object.keys(draft)) {
      if (isGym && !muscles.includes(muscle as MuscleGroup)) continue;
      for (const exercise of draft[muscle]) {
        let setNumber = 1;
        for (const set of exercise.sets) {
          const weight = parseFloat(set.weightKg);
          const reps = parseInt(set.reps, 10);
          if (Number.isNaN(weight) || Number.isNaN(reps) || reps <= 0) continue;
          result.push({
            exerciseName: exercise.name,
            muscleGroup: muscle,
            weightKg: weight,
            reps,
            setNumber: setNumber++,
          });
        }
      }
    }
    return result;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        date,
        notes: notes.trim() || null,
        intensity,
        workoutType: effectiveType,
        muscleGroups: isGym ? muscles : [],
        avgHeartRate: parseFloat(avgHr) || null,
        maxHeartRate: parseFloat(maxHr) || null,
        distanceKm: activityKind === 'distance' ? distanceKm : null,
        durationMinutes: activityKind === 'gym' ? null : durationMinutes,
        elevationM:
          activityKind === 'distance' && distanceConfig?.showElevation
            ? parseFloat(elevation) || null
            : null,
        sets: isGym ? buildSets() : [],
      };
      if (editingId != null) {
        await updateSession(editingId, payload);
      } else {
        await createSession(payload);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  const selectedTier = WORKOUT_INTENSITY_TIERS.find((t) => t.value === intensity);

  return (
    <Screen>
      <SectionTitle>אימונים</SectionTitle>

      <DateNavigator date={date} onChange={setDate} />

      <Card>
        <SectionTitle>{editingId != null ? 'עריכת אימון' : 'אימון חדש'}</SectionTitle>

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>סוג האימון</Text>
        <PillSelect
          options={[...WORKOUT_TYPES, 'אחר'].map((t) => ({ label: t, value: t }))}
          value={workoutType}
          onChange={setWorkoutType}
        />
        {workoutType === 'אחר' && (
          <Field label="שם האימון" value={customType} onChangeText={setCustomType} />
        )}

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>עצימות</Text>
        <PillSelect options={INTENSITY_OPTIONS} value={intensity} onChange={setIntensity} />
        <View
          style={{
            gap: 6,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
            מה כל רמת עצימות אומרת? (מבחן הדיבור)
          </Text>
          {WORKOUT_INTENSITY_TIERS.map((tier) => {
            const isCurrent = tier.value === intensity;
            return (
              <Text key={tier.value} style={{ textAlign: 'right', fontSize: 12, lineHeight: 18 }}>
                <Text
                  style={{
                    fontWeight: '700',
                    color: colors.text,
                    backgroundColor: isCurrent ? 'rgba(242,192,55,0.35)' : 'transparent',
                  }}
                >
                  {tier.label}
                </Text>
                <Text style={{ color: colors.muted }}> (RPE {tier.rpe}/10) — </Text>
                <Text style={{ color: colors.muted }}>{tier.description}</Text>
              </Text>
            );
          })}
        </View>

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
          דופק (לא חובה — אם מדדת עם שעון)
        </Text>
        <Row style={{ gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="דופק ממוצע" keyboardType="numeric" value={avgHr} onChangeText={setAvgHr} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="דופק מקסימלי" keyboardType="numeric" value={maxHr} onChangeText={setMaxHr} />
          </View>
        </Row>

        {activityKind !== 'gym' && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
              נתוני המאמץ
            </Text>

            {distanceConfig ? (
              <Row style={{ gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={distanceConfig.distanceLabel}
                    keyboardType="numeric"
                    value={distance}
                    onChangeText={setDistance}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="משך (דקות)"
                    keyboardType="numeric"
                    value={durationMin}
                    onChangeText={setDurationMin}
                  />
                </View>
              </Row>
            ) : (
              <Field
                label="משך (דקות)"
                keyboardType="numeric"
                value={durationMin}
                onChangeText={setDurationMin}
              />
            )}

            {distanceConfig?.showElevation && (
              <Field
                label="עלייה מצטברת (מטרים)"
                keyboardType="numeric"
                value={elevation}
                onChangeText={setElevation}
              />
            )}

            {(paceText || caloriesEstimate) && (
              <View
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: 10,
                  padding: spacing.sm,
                  gap: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {paceText && distanceConfig && (
                  <Row>
                    <Text style={{ color: colors.accentText, fontWeight: '700' }}>{paceText}</Text>
                    <Text style={{ color: colors.muted, textAlign: 'right' }}>
                      {distanceConfig.paceLabel}
                    </Text>
                  </Row>
                )}
                {durationMinutes && (
                  <Row>
                    <Text style={{ color: colors.text }}>{formatDuration(durationMinutes)}</Text>
                    <Text style={{ color: colors.muted, textAlign: 'right' }}>משך</Text>
                  </Row>
                )}
                {caloriesEstimate && (
                  <Row>
                    <Text style={{ color: colors.text }}>{caloriesEstimate} קק״ל</Text>
                    <Text style={{ color: colors.muted, textAlign: 'right' }}>
                      שריפה משוערת
                    </Text>
                  </Row>
                )}
              </View>
            )}
          </View>
        )}

        <Field label="הערות (לא חובה)" value={notes} onChangeText={setNotes} />

        {isGym && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
              אילו שרירים אימנת? (אפשר לבחור כמה)
            </Text>
            <MultiPillSelect options={MUSCLE_GROUPS} values={muscles} onToggle={toggleMuscle} />

            {muscles.map((muscle) => (
              <MuscleSection
                key={muscle}
                muscle={muscle}
                open={openMuscle === muscle}
                onToggleOpen={() => setOpenMuscle(openMuscle === muscle ? null : muscle)}
                exercises={draft[muscle] ?? []}
                suggestions={suggestions[muscle] ?? []}
                onAddExercise={(name) => addExercise(muscle, name)}
                onRemoveExercise={(i) => removeExercise(muscle, i)}
                onAddSet={(i) => addSet(muscle, i)}
                onRemoveSet={(i, j) => removeSet(muscle, i, j)}
                onUpdateSet={(i, j, field, value) => updateSet(muscle, i, j, field, value)}
              />
            ))}
          </View>
        )}

        <Button
          title={saving ? 'שומר...' : editingId != null ? 'עדכן אימון' : 'שמור אימון'}
          onPress={handleSave}
          disabled={saving}
        />
        {editingId != null && <Button title="בטל עריכה" variant="secondary" onPress={resetForm} />}
      </Card>

      <Card>
        <SectionTitle>האימונים של היום</SectionTitle>
        {sessions.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: 'right' }}>אין אימונים ביום זה</Text>
        )}
        {sessions.map((s) => (
          <View
            key={s.id}
            style={{
              paddingVertical: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 4,
            }}
          >
            <Row>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <Pressable onPress={() => deleteSession(s.id).then(load)}>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>הסר</Text>
                </Pressable>
                <Pressable onPress={() => startEditing(s)}>
                  <Text style={{ color: colors.accentText, fontSize: 12 }}>ערוך</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => router.push(`/workouts/session/${s.id}`)}
                style={{ alignItems: 'flex-end', flex: 1 }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>{s.workoutType}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  עצימות {intensityLabel(s.intensity)}
                  {s.avgHeartRate ? ` · דופק ממוצע ${Math.round(s.avgHeartRate)}` : ''}
                  {s.maxHeartRate ? ` · מקס ${Math.round(s.maxHeartRate)}` : ''}
                </Text>
              </Pressable>
            </Row>

            {(s.distanceKm != null || s.durationMinutes != null) && (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
                {[
                  s.distanceKm != null ? formatDistance(s.distanceKm, s.workoutType) : null,
                  formatDuration(s.durationMinutes),
                  getDistanceConfig(s.workoutType)
                    ? formatPace(
                        s.distanceKm,
                        s.durationMinutes,
                        getDistanceConfig(s.workoutType)!.paceKind
                      )
                    : null,
                  s.elevationM ? `${Math.round(s.elevationM)} מ׳ עלייה` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}

            {s.muscleGroups.length > 0 && (
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.xs }}>
                {s.muscleGroups.map((muscle) => {
                  const count = s.sets.filter((set) => set.muscleGroup === muscle).length;
                  return (
                    <Pressable
                      key={muscle}
                      onPress={() => router.push(`/workouts/session/${s.id}`)}
                      style={{
                        backgroundColor: colors.cardAlt,
                        borderRadius: 999,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 12 }}>
                        {muscleLabel(muscle)}
                        {count > 0 ? ` · ${count} סטים` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {s.notes ? (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>{s.notes}</Text>
            ) : null}
          </View>
        ))}
      </Card>

      {exerciseNames.length > 0 && (
        <Card>
          <SectionTitle>התקדמות לפי תרגיל</SectionTitle>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.xs }}>
            {exerciseNames.map((name) => (
              <Pressable
                key={name}
                onPress={() => router.push(`/workouts/exercise/${encodeURIComponent(name)}`)}
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: 999,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text }}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}

function MuscleSection({
  muscle,
  open,
  onToggleOpen,
  exercises,
  suggestions,
  onAddExercise,
  onRemoveExercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
}: {
  muscle: string;
  open: boolean;
  onToggleOpen: () => void;
  exercises: DraftExercise[];
  suggestions: string[];
  onAddExercise: (name: string) => void;
  onRemoveExercise: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof DraftSet,
    value: string
  ) => void;
}) {
  const [newExercise, setNewExercise] = useState('');
  const setCount = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <View
      style={{
        backgroundColor: colors.cardAlt,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <Pressable onPress={onToggleOpen} style={{ padding: spacing.sm }}>
        <Row>
          <Text style={{ color: colors.accentText, fontSize: 16 }}>{open ? '−' : '+'}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{muscleLabel(muscle)}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {exercises.length} תרגילים · {setCount} סטים
            </Text>
          </View>
        </Row>
      </Pressable>

      {open && (
        <View style={{ padding: spacing.sm, paddingTop: 0, gap: spacing.sm }}>
          <Field
            label="הוסף תרגיל"
            placeholder="שם התרגיל"
            value={newExercise}
            onChangeText={setNewExercise}
          />
          <Button
            title="הוסף תרגיל"
            variant="secondary"
            onPress={() => {
              onAddExercise(newExercise);
              setNewExercise('');
            }}
          />

          {suggestions.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'right' }}>
                תרגילים שביצעת בעבר:
              </Text>
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.xs }}>
                {suggestions.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => onAddExercise(name)}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 999,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.accentText, fontSize: 12 }}>+ {name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {exercises.map((exercise, exerciseIndex) => (
            <View
              key={`${exercise.name}-${exerciseIndex}`}
              style={{
                backgroundColor: colors.card,
                borderRadius: 8,
                padding: spacing.sm,
                gap: spacing.xs,
              }}
            >
              <Row>
                <Pressable onPress={() => onRemoveExercise(exerciseIndex)}>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>הסר תרגיל</Text>
                </Pressable>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{exercise.name}</Text>
              </Row>

              {exercise.sets.map((set, setIndex) => (
                <Row key={setIndex} style={{ gap: spacing.xs }}>
                  <Pressable onPress={() => onRemoveSet(exerciseIndex, setIndex)}>
                    <Text style={{ color: colors.danger, fontSize: 11 }}>✕</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="חזרות"
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(v) => onUpdateSet(exerciseIndex, setIndex, 'reps', v)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="משקל (ק״ג)"
                      keyboardType="numeric"
                      value={set.weightKg}
                      onChangeText={(v) => onUpdateSet(exerciseIndex, setIndex, 'weightKg', v)}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>סט {setIndex + 1}</Text>
                </Row>
              ))}

              <Button title="הוסף סט" variant="secondary" onPress={() => onAddSet(exerciseIndex)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
