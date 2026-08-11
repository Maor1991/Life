import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Field, PillSelect, Row, Screen, SectionTitle } from '../src/components/ui';
import { ActivityLevelPicker } from '../src/components/ActivityLevelPicker';
import { colors } from '../src/components/theme';
import { useProfile } from '../src/hooks/useProfile';
import { SEX_OPTIONS } from '../src/domain/activityLevels';
import { deriveActivityLevel } from '../src/domain/activityStatus';
import { computeMacroTargets } from '../src/domain/macros';
import type { Sex, WorkoutIntensity } from '../src/types';

export default function Onboarding() {
  const router = useRouter();
  const { save } = useProfile();

  const [height, setHeight] = useState('175');
  const [weight, setWeight] = useState('75');
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<Sex>('male');
  const [typicalIntensity, setTypicalIntensity] = useState<WorkoutIntensity>('moderate');
  const [weeklyWorkoutTarget, setWeeklyWorkoutTarget] = useState('4');
  const [sleepTarget, setSleepTarget] = useState('8');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activityLevel = deriveActivityLevel(
    parseFloat(weeklyWorkoutTarget) || 0,
    typicalIntensity
  );

  const preview = useMemo(() => {
    const heightCm = parseFloat(height);
    const weightKg = parseFloat(weight);
    const ageNum = parseInt(age, 10);
    if (!heightCm || !weightKg || !ageNum || heightCm <= 0 || weightKg <= 0 || ageNum <= 0) {
      return null;
    }
    return computeMacroTargets(heightCm, weightKg, ageNum, sex, activityLevel);
  }, [height, weight, age, sex, activityLevel]);

  async function handleSubmit() {
    const heightCm = parseFloat(height);
    const weightKg = parseFloat(weight);
    const ageNum = parseInt(age, 10);
    const weeklyTarget = parseInt(weeklyWorkoutTarget, 10);
    const sleepTargetHours = parseFloat(sleepTarget);

    if (
      !heightCm || heightCm <= 0 ||
      !weightKg || weightKg <= 0 ||
      !ageNum || ageNum <= 0 ||
      Number.isNaN(weeklyTarget) || weeklyTarget < 0 ||
      !sleepTargetHours || sleepTargetHours <= 0
    ) {
      setError('נא למלא את כל השדות עם ערכים תקינים');
      return;
    }

    setError(null);
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
        weightWorkout: 33.34,
        weightSleep: 33.33,
        weightNutrition: 33.33,
      });
      router.replace('/');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SectionTitle>ברוך הבא ל-Life</SectionTitle>
      <Text style={{ color: colors.muted, textAlign: 'right' }}>
        כמה פרטים כדי להתאים לך יעדי תזונה, שינה ואימונים
      </Text>

      <Card>
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
        <SectionTitle>שינה</SectionTitle>
        <Field
          label="יעד שעות שינה ללילה"
          keyboardType="numeric"
          value={sleepTarget}
          onChangeText={setSleepTarget}
        />
      </Card>

      {preview && (
        <Card>
          <SectionTitle>התוכנית שלך</SectionTitle>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
            {preview.calories} קלוריות ליום, מחושב לפי הפרופיל שהזנת
          </Text>
          <Row>
            <Text style={{ color: colors.text }}>{preview.proteinG} ג׳</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>חלבון ליום</Text>
          </Row>
          <Row>
            <Text style={{ color: colors.text }}>{preview.carbsG} ג׳</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>פחמימה ליום</Text>
          </Row>
          <Row>
            <Text style={{ color: colors.text }}>{preview.fatG} ג׳</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>שומן ליום</Text>
          </Row>
          <Row>
            <Text style={{ color: colors.text }}>{sleepTarget || '—'} שעות</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>שינה בלילה</Text>
          </Row>
          <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right', lineHeight: 19 }}>
            באימונים: כל אימון שתרשום ייספר לקראת היעד השבועי ({weeklyWorkoutTarget || 0} בשבוע).
            לכל תרגיל תוכל לראות גרף התקדמות לפי המשקל המקסימלי שהרמת בכל אימון, כדי לעקוב אחרי
            עלייה בכוח לאורך זמן.
          </Text>
        </Card>
      )}

      <Card>
        <SectionTitle>איך זה עובד</SectionTitle>
        <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right', lineHeight: 19 }}>
          כל יום מקבל ציון (0-100%) המורכב מאימונים, שינה ותזונה, לפי כמה שעמדת ביעדים שהגדרת.
          כשמגיעים ל-100% ביום מסוים, הוא נספר ב״ימים רצופים״ 🔥. בכל אימון שתרשום תוכל לציין את
          העצימות בפועל, וההגדרות יראו לך אם מה שאתה עושה בפועל תואם את התוכנית שהגדרת כאן.
        </Text>
      </Card>

      {error && <Text style={{ color: colors.danger, textAlign: 'right' }}>{error}</Text>}

      <Button title={saving ? 'שומר...' : 'התחל'} onPress={handleSubmit} disabled={saving} />
    </Screen>
  );
}
