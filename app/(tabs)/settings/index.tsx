import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from 'expo-router';
import { Button, Card, Field, PillSelect, Row, Screen, SectionTitle } from '../../../src/components/ui';
import { ActivityLevelPicker } from '../../../src/components/ActivityLevelPicker';
import { colors, spacing } from '../../../src/components/theme';
import { useAuth } from '../../../src/hooks/useAuth';
import { useProfile } from '../../../src/hooks/useProfile';
import { getSessions } from '../../../src/db/queries/workouts';
import { ACTIVITY_LEVELS, SEX_OPTIONS } from '../../../src/domain/activityLevels';
import {
  WORKOUT_INTENSITY_OPTIONS,
  computeActivityStatusWindows,
  deriveActivityLevel,
  type ActivityStatus,
  type ActivityStatusWindows,
} from '../../../src/domain/activityStatus';
import { today } from '../../../src/domain/dates';
import type { ActivityLevel, Sex, WorkoutIntensity } from '../../../src/types';

function activityLabel(level: ActivityLevel): string {
  return ACTIVITY_LEVELS.find((a) => a.value === level)?.label ?? level;
}

function intensityLabel(intensity: ActivityStatus['dominantIntensity']): string {
  return WORKOUT_INTENSITY_OPTIONS.find((o) => o.value === intensity)?.label ?? intensity;
}

const WINDOW_OPTIONS: { label: string; value: keyof ActivityStatusWindows }[] = [
  { label: 'שבוע', value: 'week' },
  { label: 'חודש', value: 'month' },
  { label: 'שנה', value: 'year' },
];

export default function SettingsScreen() {
  const { profile, save } = useProfile();
  const { session, signOut } = useAuth();

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [typicalIntensity, setTypicalIntensity] = useState<WorkoutIntensity>('moderate');
  const [weeklyWorkoutTarget, setWeeklyWorkoutTarget] = useState('');
  const [sleepTarget, setSleepTarget] = useState('');
  const [weightWorkout, setWeightWorkout] = useState(33);
  const [weightSleep, setWeightSleep] = useState(33);
  const [weightNutrition, setWeightNutrition] = useState(34);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [statusWindows, setStatusWindows] = useState<ActivityStatusWindows | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<keyof ActivityStatusWindows>('month');

  useEffect(() => {
    if (!profile) return;
    setHeight(String(profile.heightCm));
    setWeight(String(profile.weightKg));
    setAge(String(profile.age));
    setSex(profile.sex);
    setTypicalIntensity(profile.typicalIntensity);
    setWeeklyWorkoutTarget(String(profile.weeklyWorkoutTarget));
    setSleepTarget(String(profile.sleepTargetHours));
    setWeightWorkout(Math.round(profile.weightWorkout));
    setWeightSleep(Math.round(profile.weightSleep));
    setWeightNutrition(Math.round(profile.weightNutrition));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      getSessions().then((sessions) => {
        setStatusWindows(computeActivityStatusWindows(sessions, today()));
      });
    }, [])
  );

  const weightSum = weightWorkout + weightSleep + weightNutrition;
  const activityLevel = deriveActivityLevel(
    parseFloat(weeklyWorkoutTarget) || 0,
    typicalIntensity
  );

  async function handleSave() {
    const heightCm = parseFloat(height);
    const weightKg = parseFloat(weight);
    const ageNum = parseInt(age, 10);
    const weeklyTarget = parseInt(weeklyWorkoutTarget, 10);
    const sleepTargetHours = parseFloat(sleepTarget);
    if (!heightCm || !weightKg || !ageNum || Number.isNaN(weeklyTarget) || !sleepTargetHours) return;

    const sum = weightSum || 1;
    setSaving(true);
    try {
      await save({
        heightCm,
        weightKg,
        age: ageNum,
        sex,
        activityLevel,
        typicalIntensity,
        weeklyWorkoutTarget: weeklyTarget,
        sleepTargetHours,
        weightWorkout: (weightWorkout / sum) * 100,
        weightSleep: (weightSleep / sum) * 100,
        weightNutrition: (weightNutrition / sum) * 100,
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>טוען...</Text>
      </Screen>
    );
  }

  const currentStatus = statusWindows?.[selectedWindow] ?? null;
  const showSuggestion = currentStatus && currentStatus.level !== activityLevel;

  return (
    <Screen>
      <SectionTitle>הגדרות</SectionTitle>

      <Card>
        <SectionTitle>פרופיל</SectionTitle>
        <Field label="גובה (ס״מ)" keyboardType="numeric" value={height} onChangeText={setHeight} />
        <Field label="משקל (ק״ג)" keyboardType="numeric" value={weight} onChangeText={setWeight} />
        <Field label="גיל" keyboardType="numeric" value={age} onChangeText={setAge} />
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>מין</Text>
        <PillSelect options={SEX_OPTIONS} value={sex} onChange={setSex} />
      </Card>

      <Card>
        <SectionTitle>תוכנית האימונים שלך</SectionTitle>
        <ActivityLevelPicker
          weeklyFrequency={weeklyWorkoutTarget}
          onWeeklyFrequencyChange={setWeeklyWorkoutTarget}
          typicalIntensity={typicalIntensity}
          onTypicalIntensityChange={setTypicalIntensity}
        />
      </Card>

      <Card>
        <SectionTitle>סטטוס פעילות בפועל</SectionTitle>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
          מבוסס על התדירות והעצימות שרשמת באימונים בפועל
        </Text>
        <PillSelect options={WINDOW_OPTIONS} value={selectedWindow} onChange={setSelectedWindow} />

        {!currentStatus && (
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
            אין עדיין מספיק אימונים רשומים בטווח הזה כדי לחשב סטטוס
          </Text>
        )}

        {currentStatus && (
          <View style={{ gap: 6 }}>
            <Row>
              <Text style={{ color: colors.text }}>
                {currentStatus.avgSessionsPerWeek.toFixed(1)} בשבוע
              </Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>תדירות בפועל</Text>
            </Row>
            <Row>
              <Text style={{ color: colors.text }}>{intensityLabel(currentStatus.dominantIntensity)}</Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>עצימות שולטת</Text>
            </Row>
            <Row>
              <Text style={{ color: colors.text }}>{currentStatus.sessionCount} אימונים</Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>
                {currentStatus.windowLabel}
                {currentStatus.doubleSessionDays > 0 ? ` (${currentStatus.doubleSessionDays} ימים כפולים)` : ''}
              </Text>
            </Row>
            <Row>
              <Text style={{ color: colors.accentText, fontWeight: '700' }}>
                {activityLabel(currentStatus.level)}
              </Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>רמה מקבילה</Text>
            </Row>

            {showSuggestion && (
              <View
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: 10,
                  padding: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.warning,
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 13, textAlign: 'right' }}>
                  יש פער בין מה שהגדרת למה שאתה בפועל עושה
                </Text>
                <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right', lineHeight: 19 }}>
                  לפי {currentStatus.windowLabel} אתה ברמת "{activityLabel(currentStatus.level)}",
                  בעוד התוכנית שהגדרת יוצאת "{activityLabel(activityLevel)}".
                </Text>
                <Button
                  title={`התאם תוכנית ל-${currentStatus.avgSessionsPerWeek.toFixed(1)} בשבוע, עצימות ${intensityLabel(currentStatus.dominantIntensity)}`}
                  variant="secondary"
                  onPress={() => {
                    setWeeklyWorkoutTarget(String(Math.round(currentStatus.avgSessionsPerWeek)));
                    setTypicalIntensity(currentStatus.dominantIntensity);
                  }}
                />
              </View>
            )}
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle>שינה</SectionTitle>
        <Field
          label="יעד שעות שינה"
          keyboardType="numeric"
          value={sleepTarget}
          onChangeText={setSleepTarget}
        />
      </Card>

      <Card>
        <SectionTitle>משקל תחומים באחוז היומי</SectionTitle>
        <Text style={{ color: weightSum === 100 ? colors.success : colors.warning, textAlign: 'right' }}>
          סה״כ: {weightSum}% {weightSum !== 100 ? '(ינורמל אוטומטית ל-100%)' : ''}
        </Text>

        <SliderRow label="אימונים" value={weightWorkout} onChange={setWeightWorkout} />
        <SliderRow label="שינה" value={weightSleep} onChange={setWeightSleep} />
        <SliderRow label="תזונה" value={weightNutrition} onChange={setWeightNutrition} />
      </Card>

      {savedMessage && <Text style={{ color: colors.success, textAlign: 'right' }}>נשמר בהצלחה</Text>}

      <Button title={saving ? 'שומר...' : 'שמור הגדרות'} onPress={handleSave} disabled={saving} />

      <Card>
        <SectionTitle>חשבון</SectionTitle>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
          {session?.user.email}
        </Text>
        <Button title="התנתק" variant="secondary" onPress={signOut} />
      </Card>
    </Screen>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Row>
        <Text style={{ color: colors.muted }}>{value}%</Text>
        <Text style={{ color: colors.text, textAlign: 'right' }}>{label}</Text>
      </Row>
      <Slider
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
    </View>
  );
}
