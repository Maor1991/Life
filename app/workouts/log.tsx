import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  Field,
  MultiPillSelect,
  PillSelect,
  Row,
  Screen,
  SectionTitle,
} from '../../src/components/ui';
import { DateNavigator } from '../../src/components/DateNavigator';
import { InfoTooltip } from '../../src/components/InfoTooltip';
import { colors, spacing } from '../../src/components/theme';
import { useLanguage } from '../../src/hooks/useLanguage';
import {
  createSession,
  deleteSession,
  getExerciseNames,
  getExerciseNamesByMuscle,
  getSessionsByDate,
  updateSession,
  type NewSet,
} from '../../src/db/queries/workouts';
import {
  GYM_TYPE,
  OTHER_TYPE,
  WORKOUT_INTENSITY_TIERS,
  WORKOUT_TYPES,
  getMuscleGroupOptions,
  getWorkoutIntensityOptions,
  muscleLabel,
  workoutIntensityLabel,
  workoutTypeLabel,
  type MuscleGroup,
} from '../../src/domain/workoutTypes';
import {
  distanceFieldLabel,
  formatDistance,
  formatDuration,
  formatPace,
  getActivityKind,
  getDistanceConfig,
  paceFieldLabel,
} from '../../src/domain/cardio';
import { today } from '../../src/domain/dates';
import type { WorkoutIntensity, WorkoutSessionWithSets } from '../../src/types';

interface DraftSet {
  weightKg: string;
  reps: string;
}

interface DraftExercise {
  name: string;
  sets: DraftSet[];
}

type DraftByMuscle = Record<string, DraftExercise[]>;

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
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
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | null>(null);

  const effectiveType = workoutType === OTHER_TYPE ? customType.trim() || OTHER_TYPE : workoutType;
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
    ? formatPace(distanceKm, durationMinutes, distanceConfig.paceKind, t)
    : null;

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
    setEditingTemplateId(null);
  }

  function startEditing(session: WorkoutSessionWithSets) {
    setEditingId(session.id);
    setEditingTemplateId(session.templateId);
    const known = WORKOUT_TYPES.includes(session.workoutType);
    setWorkoutType(known ? session.workoutType : OTHER_TYPE);
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

  // Coming here from Home with ?sessionId=X — jump straight into editing
  // today's checked-off stub instead of making the user find it again.
  useEffect(() => {
    if (!sessionId || autoOpenedFor === sessionId) return;
    const match = sessions.find((s) => String(s.id) === sessionId);
    if (match) {
      startEditing(match);
      setAutoOpenedFor(sessionId);
    }
  }, [sessionId, sessions, autoOpenedFor]);

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
        templateId: editingTemplateId,
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

  return (
    <Screen showLogo={false}>
      <SectionTitle>{t('workouts.title')}</SectionTitle>

      <DateNavigator date={date} onChange={setDate} />

      <Card>
        <SectionTitle>{editingId != null ? t('workouts.editWorkout') : t('workouts.newWorkout')}</SectionTitle>

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{t('workouts.type')}</Text>
        <PillSelect
          options={[...WORKOUT_TYPES, OTHER_TYPE].map((type) => ({
            label: workoutTypeLabel(type, t),
            value: type,
          }))}
          value={workoutType}
          onChange={setWorkoutType}
        />
        {workoutType === OTHER_TYPE && (
          <Field label={t('workouts.name')} value={customType} onChangeText={setCustomType} />
        )}

        <Row style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start', gap: 6 }}>
          <InfoTooltip>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, textAlign: align, marginBottom: 4 }}>
              {t('workouts.intensityMeaning')}
            </Text>
            {WORKOUT_INTENSITY_TIERS.map((tier) => (
              <Text key={tier.value} style={{ textAlign: align, fontSize: 13, lineHeight: 19 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {workoutIntensityLabel(tier.value, t)}
                </Text>
                <Text style={{ color: colors.muted }}> ({t('workouts.rpe', { rpe: tier.rpe })}) — </Text>
                <Text style={{ color: colors.muted }}>{t(`intensity.${tier.value}.description`)}</Text>
              </Text>
            ))}
          </InfoTooltip>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{t('workouts.intensity')}</Text>
        </Row>
        <PillSelect options={getWorkoutIntensityOptions(t)} value={intensity} onChange={setIntensity} />

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
          {t('workouts.heartRateOptional')}
        </Text>
        <Row style={{ gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label={t('workouts.avgHeartRate')} keyboardType="numeric" value={avgHr} onChangeText={setAvgHr} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('workouts.maxHeartRate')} keyboardType="numeric" value={maxHr} onChangeText={setMaxHr} />
          </View>
        </Row>

        {activityKind !== 'gym' && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
              {t('workouts.effortData')}
            </Text>

            {distanceConfig ? (
              <Row style={{ gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={distanceFieldLabel(distanceConfig, t)}
                    keyboardType="numeric"
                    value={distance}
                    onChangeText={setDistance}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t('workouts.durationMinutes')}
                    keyboardType="numeric"
                    value={durationMin}
                    onChangeText={setDurationMin}
                  />
                </View>
              </Row>
            ) : (
              <Field
                label={t('workouts.durationMinutes')}
                keyboardType="numeric"
                value={durationMin}
                onChangeText={setDurationMin}
              />
            )}

            {distanceConfig?.showElevation && (
              <Field
                label={t('workouts.elevation')}
                keyboardType="numeric"
                value={elevation}
                onChangeText={setElevation}
              />
            )}

            {paceText && distanceConfig && (
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
                <Row>
                  <Text style={{ color: colors.accentText, fontWeight: '700' }}>{paceText}</Text>
                  <Text style={{ color: colors.muted, textAlign: align }}>
                    {paceFieldLabel(distanceConfig, t)}
                  </Text>
                </Row>
                {durationMinutes && (
                  <Row>
                    <Text style={{ color: colors.text }}>{formatDuration(durationMinutes, t)}</Text>
                    <Text style={{ color: colors.muted, textAlign: align }}>{t('workouts.duration')}</Text>
                  </Row>
                )}
              </View>
            )}
          </View>
        )}

        <Field label={t('workouts.notesOptional')} value={notes} onChangeText={setNotes} />

        {isGym && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
              {t('workouts.whichMuscles')}
            </Text>
            <MultiPillSelect options={getMuscleGroupOptions(t)} values={muscles} onToggle={toggleMuscle} />

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
                t={t}
                align={align}
              />
            ))}
          </View>
        )}

        <Button
          title={saving ? t('common.saving') : editingId != null ? t('workouts.updateWorkout') : t('workouts.saveWorkout')}
          onPress={handleSave}
          disabled={saving}
        />
        {editingId != null && <Button title={t('common.cancelEdit')} variant="secondary" onPress={resetForm} />}
      </Card>

      <Card>
        <SectionTitle>{t('workouts.todaysWorkouts')}</SectionTitle>
        {sessions.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: align }}>{t('workouts.noWorkoutsThisDay')}</Text>
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
                  <Text style={{ color: colors.danger, fontSize: 12 }}>{t('common.remove')}</Text>
                </Pressable>
                <Pressable onPress={() => startEditing(s)}>
                  <Text style={{ color: colors.accentText, fontSize: 12 }}>{t('common.edit')}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => router.push(`/workouts/session/${s.id}`)}
                style={{ alignItems: 'flex-end', flex: 1 }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>{workoutTypeLabel(s.workoutType, t)}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {t('workouts.intensity')} {workoutIntensityLabel(s.intensity, t)}
                  {s.avgHeartRate ? ` · ${t('workouts.avgHeartRateShort', { value: Math.round(s.avgHeartRate) })}` : ''}
                  {s.maxHeartRate ? ` · ${t('workouts.maxHeartRateShort', { value: Math.round(s.maxHeartRate) })}` : ''}
                </Text>
              </Pressable>
            </Row>

            {(s.distanceKm != null || s.durationMinutes != null) && (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>
                {[
                  s.distanceKm != null ? formatDistance(s.distanceKm, s.workoutType, t) : null,
                  formatDuration(s.durationMinutes, t),
                  getDistanceConfig(s.workoutType)
                    ? formatPace(
                        s.distanceKm,
                        s.durationMinutes,
                        getDistanceConfig(s.workoutType)!.paceKind,
                        t
                      )
                    : null,
                  s.elevationM ? t('workouts.elevationLine', { value: Math.round(s.elevationM) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}

            {s.muscleGroups.length > 0 && (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: spacing.xs }}>
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
                        {muscleLabel(muscle, t)}
                        {count > 0 ? ` · ${t('workouts.setsShort', { count })}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {s.notes ? (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>{s.notes}</Text>
            ) : null}
          </View>
        ))}
      </Card>

      {exerciseNames.length > 0 && (
        <Card>
          <SectionTitle>{t('workouts.progressByExercise')}</SectionTitle>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: spacing.xs }}>
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
  t,
  align,
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
  t: (key: string, vars?: Record<string, string | number>) => string;
  align: 'left' | 'right';
}) {
  const { isRTL } = useLanguage();
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
            <Text style={{ color: colors.text, fontWeight: '700' }}>{muscleLabel(muscle, t)}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {t('workouts.exercisesAndSets', { exercises: exercises.length, sets: setCount })}
            </Text>
          </View>
        </Row>
      </Pressable>

      {open && (
        <View style={{ padding: spacing.sm, paddingTop: 0, gap: spacing.sm }}>
          <Field
            label={t('workouts.addExercise')}
            placeholder={t('workouts.exerciseName')}
            value={newExercise}
            onChangeText={setNewExercise}
          />
          <Button
            title={t('workouts.addExercise')}
            variant="secondary"
            onPress={() => {
              onAddExercise(newExercise);
              setNewExercise('');
            }}
          />

          {suggestions.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.muted, fontSize: 11, textAlign: align }}>
                {t('workouts.pastExercises')}
              </Text>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: spacing.xs }}>
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
                  <Text style={{ color: colors.danger, fontSize: 12 }}>{t('workouts.removeExercise')}</Text>
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
                      label={t('workouts.reps')}
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(v) => onUpdateSet(exerciseIndex, setIndex, 'reps', v)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t('workouts.weightKg')}
                      keyboardType="numeric"
                      value={set.weightKg}
                      onChangeText={(v) => onUpdateSet(exerciseIndex, setIndex, 'weightKg', v)}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {t('workouts.setNumber', { number: setIndex + 1 })}
                  </Text>
                </Row>
              ))}

              <Button title={t('workouts.addSet')} variant="secondary" onPress={() => onAddSet(exerciseIndex)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
