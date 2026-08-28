import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button, Card, Field, MultiPillSelect, PillSelect, Row, Screen, SectionTitle } from '../../src/components/ui';
import { colors, spacing } from '../../src/components/theme';
import { useLanguage } from '../../src/hooks/useLanguage';
import {
  addWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutTemplates,
} from '../../src/db/queries/workoutTemplates';
import {
  GYM_TYPE,
  OTHER_TYPE,
  WORKOUT_TYPES,
  getMuscleGroupOptions,
  muscleLabel,
  workoutTypeLabel,
  type MuscleGroup,
} from '../../src/domain/workoutTypes';
import { getActivityKind } from '../../src/domain/cardio';
import type { WorkoutTemplate } from '../../src/types';

export default function WorkoutTemplatesScreen() {
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  const [name, setName] = useState('');
  const [workoutType, setWorkoutType] = useState<string>(GYM_TYPE);
  const [customType, setCustomType] = useState('');
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setTemplates(await getWorkoutTemplates());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const effectiveType = workoutType === OTHER_TYPE ? customType.trim() || OTHER_TYPE : workoutType;
  const isGym = getActivityKind(effectiveType) === 'gym';

  function toggleMuscle(muscle: MuscleGroup) {
    setMuscles((prev) => (prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]));
  }

  function resetForm() {
    setName('');
    setWorkoutType(GYM_TYPE);
    setCustomType('');
    setMuscles([]);
  }

  async function handleSave() {
    const effectiveName = name.trim() || workoutTypeLabel(effectiveType, t);
    setSaving(true);
    try {
      await addWorkoutTemplate({
        name: effectiveName,
        workoutType: effectiveType,
        muscleGroups: isGym ? muscles : [],
      });
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen showLogo={false}>
      <SectionTitle>{t('workoutTemplates.title')}</SectionTitle>
      <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
        {t('workoutTemplates.subtitle')}
      </Text>

      <Card>
        <Field label={t('workoutTemplates.name')} placeholder={t('workoutTemplates.namePlaceholder')} value={name} onChangeText={setName} />

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{t('workouts.type')}</Text>
        <PillSelect
          options={[...WORKOUT_TYPES, OTHER_TYPE].map((type) => ({ label: workoutTypeLabel(type, t), value: type }))}
          value={workoutType}
          onChange={setWorkoutType}
        />
        {workoutType === OTHER_TYPE && (
          <Field label={t('workouts.name')} value={customType} onChangeText={setCustomType} />
        )}

        {isGym && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{t('workouts.whichMuscles')}</Text>
            <MultiPillSelect options={getMuscleGroupOptions(t)} values={muscles} onToggle={toggleMuscle} />
          </View>
        )}

        <Button title={saving ? t('common.saving') : t('workoutTemplates.save')} onPress={handleSave} disabled={saving} />
      </Card>

      <Card>
        <SectionTitle>{t('workoutTemplates.list')}</SectionTitle>
        {templates.length === 0 && (
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{t('workoutTemplates.empty')}</Text>
        )}
        {templates.map((template) => (
          <Row
            key={template.id}
            style={{ paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Pressable onPress={() => deleteWorkoutTemplate(template.id).then(load)}>
              <Text style={{ color: colors.danger, fontSize: 12 }}>{t('common.delete')}</Text>
            </Pressable>
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <Text style={{ color: colors.text }}>{template.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {workoutTypeLabel(template.workoutType, t)}
                {template.muscleGroups.length > 0
                  ? ` · ${template.muscleGroups.map((m) => muscleLabel(m, t)).join(', ')}`
                  : ''}
              </Text>
            </View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
