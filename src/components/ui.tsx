import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Oswald_600SemiBold, Oswald_300Light } from '@expo-google-fonts/oswald';
import * as Haptics from 'expo-haptics';
import { colors, shadows, spacing, typography } from './theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * `showLogo` defaults to true; pass false on screens that already carry their
 * own large mark (sign-in). `cornerAction` renders pinned to the top-left
 * corner, `cornerActionRight` to the top-right — both vertically centered on
 * the logo mark (e.g. a calendar shortcut on the left, a menu on the right).
 */
export function Screen({
  children,
  showLogo = true,
  showLogoText = true,
  cornerAction,
  cornerActionRight,
}: {
  children: React.ReactNode;
  showLogo?: boolean;
  /** Hide just the wordmark under the logo image, e.g. on Home. */
  showLogoText?: boolean;
  cornerAction?: React.ReactNode;
  cornerActionRight?: React.ReactNode;
}) {
  const [fontsLoaded] = useFonts({ Oswald_600SemiBold, Oswald_300Light });
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        {showLogo && (
          <View style={styles.logoWrap}>
            {cornerAction && <View style={styles.logoCorner}>{cornerAction}</View>}
            {cornerActionRight && <View style={styles.logoCornerRight}>{cornerActionRight}</View>}
            <Image
              source={require('../../assets/person-tree-logo.png')}
              style={styles.centerLogo}
              resizeMode="contain"
            />
            {showLogoText && (
              <Text style={[styles.logoText, fontsLoaded && { fontFamily: 'Oswald_600SemiBold' }]}>
                C
                <Text style={fontsLoaded && { fontFamily: 'Oswald_300Light' }}>'</Text>
                e la vie
              </Text>
            )}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { isRTL } = useLanguage();
  return <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{children}</Text>;
}

export function Field({
  label,
  ...props
}: { label: string } & TextInputProps) {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
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
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.timing(scale, { toValue: 0.96, duration: 90, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.button,
          variant === 'secondary' && styles.buttonSecondary,
          variant === 'danger' && styles.buttonDanger,
          disabled && { opacity: 0.6 },
          { transform: [{ scale }] },
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
      </Animated.View>
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

/** Tappable section header that expands/collapses the content below it. */
/** Tappable section header that expands/collapses the content below it. */
export function CollapsibleHeader({
  title,
  count,
  open,
  onToggle,
}: {
  title: string;
  count?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const rotation = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(rotation, { toValue: open ? 1 : 0, friction: 8, tension: 120, useNativeDriver: true }).start();
  }, [open, rotation]);

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <Pressable onPress={handleToggle}>
      <Row>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {count && <Text style={{ color: colors.muted, fontSize: typography.caption }}>{count}</Text>}
          <View style={styles.disclosureButton}>
            <Animated.Text style={[styles.disclosureIcon, { transform: [{ rotate }] }]}>›</Animated.Text>
          </View>
        </View>
        <SectionTitle>{title}</SectionTitle>
      </Row>
    </Pressable>
  );
}

/** A checkbox row for a checklist item — meal, workout, or sleep. Pass `checkbox={false}` for a plain list row with no checkbox (e.g. a template library entry). */
export function ChecklistRow({
  label,
  subLabel,
  checked,
  align,
  onToggle,
  onOpenDetails,
  detailsLabel,
  strikethrough = true,
  checkbox = true,
}: {
  label: string;
  subLabel?: string;
  checked: boolean;
  align: 'left' | 'right';
  onToggle: () => void;
  onOpenDetails?: () => void;
  detailsLabel?: string;
  strikethrough?: boolean;
  checkbox?: boolean;
}) {
  const pop = useRef(new Animated.Value(1)).current;
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (checked && !wasChecked.current) {
      pop.setValue(0.55);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start();
    }
    wasChecked.current = checked;
  }, [checked, pop]);

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
      }}
    >
      {checkbox && (
        <Pressable onPress={handleToggle} hitSlop={8}>
          <Animated.View
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: checked ? colors.primary : colors.border,
              backgroundColor: checked ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pop }],
            }}
          >
            {checked && <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 15 }}>✓</Text>}
          </Animated.View>
        </Pressable>
      )}

      <Pressable onPress={handleToggle} style={{ flex: 1, paddingHorizontal: spacing.sm }}>
        <Text
          style={{
            color: checked ? colors.muted : colors.text,
            fontSize: typography.label,
            fontWeight: '600',
            textAlign: align,
            textDecorationLine: checked && strikethrough ? 'line-through' : 'none',
          }}
        >
          {label}
        </Text>
        {subLabel && (
          <Text style={{ color: colors.muted, fontSize: typography.caption, textAlign: align }}>{subLabel}</Text>
        )}
      </Pressable>

      {onOpenDetails && (
        <Pressable onPress={onOpenDetails} hitSlop={8}>
          <Text style={{ color: colors.muted, fontSize: typography.caption, fontWeight: '600' }}>
            {detailsLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** Empty-state hint pointing the user at Settings to add meal/workout templates. */
export function ChecklistEmptyState({
  align,
  messageKey,
  icon,
}: {
  align: 'left' | 'right';
  messageKey: string;
  /** Single emoji shown above the message for a softer, less clinical empty state. */
  icon?: string;
}) {
  const { t } = useLanguage();
  return (
    <View style={{ gap: 4, alignItems: align === 'right' ? 'flex-end' : 'flex-start', paddingVertical: 4 }}>
      {icon && <Text style={{ fontSize: 22, opacity: 0.6 }}>{icon}</Text>}
      <Text style={{ color: colors.muted, fontSize: typography.caption, textAlign: align }}>{t(messageKey)}</Text>
      <Text
        style={{ color: colors.accentText, fontSize: typography.caption, textAlign: align, fontWeight: '600' }}
      >
        {t('checklist.addInSettings')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
  },
  logoCorner: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 63,
    justifyContent: 'center',
  },
  logoCornerRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 63,
    justifyContent: 'center',
  },
  centerLogo: {
    width: 52,
    height: 63,
    opacity: 0.85,
    marginBottom: 0,
  },
  logoText: {
    fontSize: 24,
    letterSpacing: 1.5,
    color: colors.text,
    opacity: 0.85,
    textAlign: 'center',
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
    fontSize: typography.title,
    fontWeight: '700',
    textAlign: 'right',
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: typography.caption,
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
    fontSize: typography.subhead,
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
    fontSize: typography.subhead,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  disclosureButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosureIcon: {
    color: colors.accentText,
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: typography.caption,
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
