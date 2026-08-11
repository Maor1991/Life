import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows, spacing } from './theme';

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Field({
  label,
  ...props
}: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || disabled) && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function PillSelect<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MultiPillSelect<T extends string>({
  options,
  values,
  onToggle,
}: {
  options: { label: string; value: T }[];
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const active = values.includes(opt.value);
        return (
          <Pressable
            key={opt.value}
            onPress={() => onToggle(opt.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {active ? `✓ ${opt.label}` : opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StepScale({
  steps,
  activeIndex,
  color,
}: {
  steps: number;
  activeIndex: number;
  color?: string;
}) {
  return (
    <View style={styles.stepScaleRow}>
      {Array.from({ length: steps }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepScaleSegment,
            { backgroundColor: i <= activeIndex ? color ?? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${clamped}%`, backgroundColor: color ?? colors.primary },
        ]}
      />
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    textAlign: 'right',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadows.card,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.muted,
    fontSize: 13,
  },
  pillTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  stepScaleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  stepScaleSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
