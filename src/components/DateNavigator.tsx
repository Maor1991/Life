import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { MonthCalendar } from './MonthCalendar';
import { colors, spacing } from './theme';
import { addDays, parseDate, today } from '../domain/dates';

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function formatDateLabel(date: string): string {
  const d = parseDate(date);
  const t = today();
  if (date === t) return 'היום';
  if (date === addDays(t, -1)) return 'אתמול';
  if (date === addDays(t, 1)) return 'מחר';
  return `יום ${WEEKDAYS[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}`;
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = date === today();
  const canGoForward = allowFuture || date < today();

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.cardAlt,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        }}
      >
        {/* In RTL, moving forward in time reads leftward. */}
        <Pressable
          onPress={() => canGoForward && onChange(addDays(date, 1))}
          disabled={!canGoForward}
          style={{ padding: spacing.xs, opacity: canGoForward ? 1 : 0.3 }}
        >
          <Text style={{ color: colors.accentText, fontSize: 20, fontWeight: '700' }}>‹</Text>
        </Pressable>

        <Pressable onPress={() => setCalendarOpen(true)} style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
            {formatDateLabel(date)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{date} · לבחירת תאריך</Text>
        </Pressable>

        <Pressable onPress={() => onChange(addDays(date, -1))} style={{ padding: spacing.xs }}>
          <Text style={{ color: colors.accentText, fontSize: 20, fontWeight: '700' }}>›</Text>
        </Pressable>
      </View>

      {!isToday && (
        <Pressable onPress={() => onChange(today())} style={{ alignSelf: 'center' }}>
          <Text style={{ color: colors.accentText, fontSize: 13 }}>חזור להיום</Text>
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
              <Text style={{ color: colors.text, fontWeight: '700' }}>היום</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
