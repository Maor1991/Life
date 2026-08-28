import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MonthCalendar } from './MonthCalendar';
import { colors, shadows, spacing } from './theme';
import { addDays, parseDate, today } from '../domain/dates';
import { useLanguage } from '../hooks/useLanguage';

export function formatDateLabel(date: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const d = parseDate(date);
  const now = today();
  if (date === now) return t('common.today');
  if (date === addDays(now, -1)) return t('common.yesterday');
  if (date === addDays(now, 1)) return t('common.tomorrow');
  return t('common.dateLabel', {
    weekday: t(`common.weekday.${d.getDay()}`),
    day: d.getDate(),
    month: d.getMonth() + 1,
  });
}

export function DateNavigator({
  date,
  onChange,
  allowFuture = false,
}: {
  date: string;
  onChange: (date: string) => void;
  allowFuture?: boolean;
}) {
  const { t, isRTL } = useLanguage();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = date === today();
  const canGoForward = allowFuture || date < today();

  function goPrev() {
    onChange(addDays(date, -1));
  }
  function goNext() {
    if (canGoForward) onChange(addDays(date, 1));
  }

  // Position is fixed (previous stays on the left, next on the right) so the
  // control never "jumps" between languages — only the chevron glyph swaps,
  // matching the RTL convention of a right-pointing "back" chevron.
  const prevGlyph = isRTL ? '›' : '‹';
  const nextGlyph = isRTL ? '‹' : '›';

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.cardAlt,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xs,
          ...shadows.card,
        }}
      >
        <Pressable onPress={goPrev} hitSlop={8} style={styles.navCircle}>
          <Text style={styles.navGlyph}>{prevGlyph}</Text>
        </Pressable>

        <Pressable onPress={() => setCalendarOpen(true)} style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
            {formatDateLabel(date, t)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{date} · {t('common.pickDate')}</Text>
        </Pressable>

        <Pressable
          onPress={goNext}
          disabled={!canGoForward}
          hitSlop={8}
          style={[styles.navCircle, { opacity: canGoForward ? 1 : 0.3 }]}
        >
          <Text style={styles.navGlyph}>{nextGlyph}</Text>
        </Pressable>
      </View>

      {!isToday && (
        <Pressable onPress={() => onChange(today())} style={{ alignSelf: 'center' }}>
          <Text style={{ color: colors.accentText, fontSize: 13 }}>{t('common.backToToday')}</Text>
        </Pressable>
      )}

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable
          onPress={() => setCalendarOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: spacing.md,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.sm,
              gap: spacing.sm,
            }}
          >
            <MonthCalendar
              selectedDate={date}
              maxDate={allowFuture ? undefined : today()}
              onSelect={(d) => {
                onChange(d);
                setCalendarOpen(false);
              }}
            />

            <Pressable
              onPress={() => {
                onChange(today());
                setCalendarOpen(false);
              }}
              style={{
                backgroundColor: colors.cardAlt,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.today')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  navCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyph: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: '700',
  },
});
