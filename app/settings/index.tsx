import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Field, PillSelect, Row, Screen, SectionTitle } from '../../src/components/ui';
import { InfoTooltip } from '../../src/components/InfoTooltip';
import { SlideMenu } from '../../src/components/SlideMenu';
import { colors, spacing } from '../../src/components/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useNutritionTargets } from '../../src/hooks/useNutritionTargets';
import { getWorkoutIntensityOptions } from '../../src/domain/workoutTypes';
import { computeMacroBreakdown } from '../../src/domain/macroTargets';
import type { Sex } from '../../src/domain/macroTargets';
import type { WorkoutIntensity } from '../../src/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { openCalorie: openCalorieParam } = useLocalSearchParams<{ openCalorie?: string }>();
  const { session, signOut } = useAuth();
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const { stats, hasStats, targets, save } = useNutritionTargets();
  const breakdown = hasStats
    ? computeMacroBreakdown(
        stats.heightCm!,
        stats.weightKg!,
        stats.age!,
        stats.sex!,
        stats.workoutsPerWeek!,
        stats.plannedIntensity!
      )
    : null;
  const bmrFormula = hasStats
    ? `10×${stats.weightKg} + 6.25×${stats.heightCm} − 5×${stats.age} ${stats.sex === 'male' ? '+ 5' : '− 161'}`
    : '';

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState('');
  const [plannedIntensity, setPlannedIntensity] = useState<WorkoutIntensity>('moderate');
  const [restDay, setRestDay] = useState<number>(-1);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [calorieOpen, setCalorieOpen] = useState(openCalorieParam === '1');

  useEffect(() => {
    if (stats.heightCm != null) setHeight(String(stats.heightCm));
    if (stats.weightKg != null) setWeight(String(stats.weightKg));
    if (stats.age != null) setAge(String(stats.age));
    if (stats.sex != null) setSex(stats.sex);
    if (stats.workoutsPerWeek != null) setWorkoutsPerWeek(String(stats.workoutsPerWeek));
    if (stats.plannedIntensity != null) setPlannedIntensity(stats.plannedIntensity);
    setRestDay(stats.restDayOfWeek ?? -1);
  }, [stats]);

  async function handleSave() {
    const heightCm = parseFloat(height);
    const weightKg = parseFloat(weight);
    const ageNum = parseInt(age, 10);
    const workoutsNum = parseInt(workoutsPerWeek, 10);
    if (!heightCm || !weightKg || !ageNum || Number.isNaN(workoutsNum)) return;
    setSaving(true);
    try {
      await save({
        heightCm,
        weightKg,
        age: ageNum,
        sex,
        workoutsPerWeek: workoutsNum,
        plannedIntensity,
        restDayOfWeek: restDay === -1 ? null : restDay,
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideMenu
      items={[
        { label: t('home.title'), onPress: () => router.push('/') },
        { label: t('checklist.myWeek'), onPress: () => router.push('/my-week') },
        { label: t('trends.title'), onPress: () => router.push('/trends') },
        { label: t('settings.title'), onPress: () => router.push('/settings') },
      ]}
    >
      <Screen showLogo={false}>
      <SectionTitle>{t('settings.title')}</SectionTitle>

      <Card>
        <Pressable onPress={() => setCalorieOpen((v) => !v)}>
          <Row>
            <Text style={{ color: colors.accentText, fontSize: 20 }}>›</Text>
            <SectionTitle>{t('settings.calorieGoal')}</SectionTitle>
          </Row>
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
          {t('settings.calorieGoalSubtitle')}
        </Text>
        {calorieOpen && (
          <>
            <Field label={t('settings.height')} keyboardType="numeric" value={height} onChangeText={setHeight} />
            <Field label={t('settings.weight')} keyboardType="numeric" value={weight} onChangeText={setWeight} />
            <Field label={t('settings.age')} keyboardType="numeric" value={age} onChangeText={setAge} />
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{t('settings.sex')}</Text>
            <PillSelect
              options={[
                { label: t('sex.male'), value: 'male' },
                { label: t('sex.female'), value: 'female' },
              ]}
              value={sex}
              onChange={setSex}
            />

            <Field
              label={t('settings.plannedWorkouts')}
              keyboardType="numeric"
              value={workoutsPerWeek}
              onChangeText={setWorkoutsPerWeek}
            />
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
              {t('settings.plannedIntensity')}
            </Text>
            <PillSelect
              options={getWorkoutIntensityOptions(t)}
              value={plannedIntensity}
              onChange={setPlannedIntensity}
            />

            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, marginTop: 4 }}>
              {t('settings.restDay')}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: align }}>
              {t('settings.restDaySubtitle')}
            </Text>
            <PillSelect
              options={[
                { label: t('settings.restDayNone'), value: -1 },
                ...[0, 1, 2, 3, 4, 5, 6].map((d) => ({ label: t(`common.weekday.${d}`), value: d })),
              ]}
              value={restDay}
              onChange={setRestDay}
            />

            {hasStats && (
              <View
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: 12,
                  padding: spacing.sm,
                  gap: spacing.sm,
                }}
              >
                <Row>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <InfoTooltip>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: '700',
                          fontSize: 14,
                          textAlign: align,
                          marginBottom: 4,
                        }}
                      >
                        {t('settings.calorieMethodTitle')}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, lineHeight: 19 }}>
                        {t('settings.calorieMethodBmr')}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, lineHeight: 19 }}>
                        {t('settings.calorieMethodActivity')}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, lineHeight: 19 }}>
                        {t('settings.calorieMethodMacros')}
                      </Text>

                      {breakdown && (
                        <View
                          style={{
                            marginTop: 6,
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                            gap: 3,
                          }}
                        >
                          <Text
                            style={{ color: colors.text, fontWeight: '700', fontSize: 13, textAlign: align }}
                          >
                            {t('settings.calorieMethodExampleTitle')}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, lineHeight: 19 }}>
                            {t('settings.calorieMethodExampleBmr', { formula: bmrFormula, bmr: breakdown.bmr })}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, lineHeight: 19 }}>
                            {t('settings.calorieMethodExampleCalories', {
                              bmr: breakdown.bmr,
                              multiplier: breakdown.activityMultiplier,
                              calories: breakdown.calories,
                            })}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, lineHeight: 19 }}>
                            {t('settings.calorieMethodExampleMacros', {
                              protein: breakdown.proteinG,
                              fat: breakdown.fatG,
                              carbs: breakdown.carbsG,
                            })}
                          </Text>
                        </View>
                      )}
                    </InfoTooltip>
                    <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>
                      {t('settings.computedGoal')}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                    {targets.calories}
                    <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '400' }}>
                      {' '}
                      {t('nutrition.kcalShort')}
                    </Text>
                  </Text>
                </Row>

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
                  {[
                    { key: 'protein', label: t('nutrition.protein'), value: targets.proteinG, color: colors.primary },
                    { key: 'carbs', label: t('nutrition.carbs'), value: targets.carbsG, color: colors.warning },
                    { key: 'fat', label: t('nutrition.fat'), value: targets.fatG, color: colors.danger },
                  ].map((m) => (
                    <View key={m.key} style={{ alignItems: 'center', gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color }} />
                        <Text style={{ color: colors.muted, fontSize: 11 }}>{m.label}</Text>
                      </View>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                        {m.value}
                        <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '700' }}>
                          {' '}
                          {t('nutrition.gramsShort')}
                        </Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {savedMessage && <Text style={{ color: colors.success, textAlign: align }}>{t('settings.saved')}</Text>}
            <Button title={saving ? t('common.saving') : t('common.save')} onPress={handleSave} disabled={saving} />
          </>
        )}
      </Card>

      <LinkCard
        title={t('mealLibrary.title')}
        subtitle={t('mealLibrary.subtitle')}
        align={align}
        onPress={() => router.push('/settings/meal-library')}
      />

      <LinkCard
        title={t('workoutTemplates.title')}
        subtitle={t('workoutTemplates.subtitle')}
        align={align}
        onPress={() => router.push('/settings/workout-templates')}
      />

      <Card>
        <SectionTitle>{t('settings.account')}</SectionTitle>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{session?.user.email}</Text>
        <Button title={t('settings.signOut')} variant="secondary" onPress={signOut} />
      </Card>
      </Screen>
    </SlideMenu>
  );
}

function LinkCard({
  title,
  subtitle,
  align,
  onPress,
}: {
  title: string;
  subtitle: string;
  align: 'left' | 'right';
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Row>
          <Text style={{ color: colors.accentText, fontSize: 20 }}>›</Text>
          <SectionTitle>{title}</SectionTitle>
        </Row>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{subtitle}</Text>
      </Card>
    </Pressable>
  );
}
