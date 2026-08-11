import React from 'react';
import { Text, View } from 'react-native';
import { Field, PillSelect, Row, StepScale } from './ui';
import { colors, spacing } from './theme';
import { ACTIVITY_LEVELS, INTENSITY_LEVELS } from '../domain/activityLevels';
import { WORKOUT_INTENSITY_OPTIONS, deriveActivityLevel } from '../domain/activityStatus';
import type { WorkoutIntensity } from '../types';

export function ActivityLevelPicker({
  weeklyFrequency,
  onWeeklyFrequencyChange,
  typicalIntensity,
  onTypicalIntensityChange,
}: {
  weeklyFrequency: string;
  onWeeklyFrequencyChange: (v: string) => void;
  typicalIntensity: WorkoutIntensity;
  onTypicalIntensityChange: (v: WorkoutIntensity) => void;
}) {
  const frequency = parseFloat(weeklyFrequency) || 0;
  const derivedLevel = deriveActivityLevel(frequency, typicalIntensity);
  const index = ACTIVITY_LEVELS.findIndex((a) => a.value === derivedLevel);
  const info = ACTIVITY_LEVELS[index];
  const currentTierLabel =
    WORKOUT_INTENSITY_OPTIONS.find((o) => o.value === typicalIntensity)?.label ?? '';

  return (
    <View style={{ gap: spacing.sm }}>
      <Field
        label="כמה אימונים בשבוע אתה מתכנן?"
        keyboardType="numeric"
        value={weeklyFrequency}
        onChangeText={onWeeklyFrequencyChange}
      />

      <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
        עצימות טיפוסית לאימון
      </Text>
      <PillSelect
        options={WORKOUT_INTENSITY_OPTIONS}
        value={typicalIntensity}
        onChange={onTypicalIntensityChange}
      />

      <View
        style={{
          gap: 6,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
          מה זאת עצימות בפועל? (מבחן הדיבור)
        </Text>
        {INTENSITY_LEVELS.map((tier) => {
          const isCurrent = currentTierLabel === tier.label;
          return (
            <Text key={tier.label} style={{ textAlign: 'right', fontSize: 12, lineHeight: 18 }}>
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
              <Text style={{ color: colors.text }}>{tier.talkTest}. </Text>
              <Text style={{ color: colors.muted }}>{tier.example}.</Text>
            </Text>
          );
        })}
      </View>

      {info && (
        <View
          style={{
            gap: 6,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Row>
            <Text style={{ color: colors.accentText, fontWeight: '700' }}>{info.label}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
              רמת הפעילות המחושבת שלך
            </Text>
          </Row>
          <StepScale steps={ACTIVITY_LEVELS.length} activeIndex={index} />
          <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right', lineHeight: 19 }}>
            {info.description}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right', lineHeight: 18 }}>
            הרמה מחושבת מהשילוב של התדירות והעצימות — {frequency || 0} אימונים בשבוע בעצימות
            {' '}{currentTierLabel}. היא קובעת את יעד הקלוריות והמאקרו שלך.
          </Text>
        </View>
      )}
    </View>
  );
}
