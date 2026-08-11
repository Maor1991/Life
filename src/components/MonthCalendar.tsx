import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, scoreColor, scoreTint, shadows, spacing } from './theme';
import { formatDate, parseDate, today as todayFn } from '../domain/dates';

const WEEKDAY_INITIALS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const MONTH_NAMES = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

/** Soft fill + accent per score band, so the month reads as a heatmap. */
function scoreStyle(pct: number | undefined): { fill: string; accent: string | null } {
  if (pct === undefined || pct <= 0) return { fill: 'transparent', accent: null };
  return { fill: scoreTint(pct), accent: scoreColor(pct) };
}

interface DayCell {
  date: string | null;
  day: number;
}

function buildMonthGrid(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // 0 = Sunday

  const cells: DayCell[] = [];
  for (let i = 0; i < leading; i++) cells.push({ date: null, day: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: formatDate(new Date(year, month, d)), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: 0 });

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function MonthCalendar({
  selectedDate,
  onSelect,
  scores,
  maxDate,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  /** Optional date -> percentage map used to tint each day. */
  scores?: Record<string, number>;
  maxDate?: string;
}) {
  const initial = parseDate(selectedDate);
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const today = todayFn();

  const weeks = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  function shiftMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  const canGoForward =
    !maxDate ||
    new Date(cursor.year, cursor.month + 1, 1) <= parseDate(maxDate);

  return (
    <View style={{ gap: spacing.sm }}>
      {/* In RTL, moving forward in time reads leftward. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => canGoForward && shiftMonth(1)}
          disabled={!canGoForward}
          hitSlop={8}
          style={{ padding: spacing.xs, opacity: canGoForward ? 1 : 0.25 }}
        >
          <Text style={{ color: colors.accentText, fontSize: 22, fontWeight: '700' }}>‹</Text>
        </Pressable>

        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </Text>

        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} style={{ padding: spacing.xs }}>
          <Text style={{ color: colors.accentText, fontSize: 22, fontWeight: '700' }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row-reverse' }}>
        {WEEKDAY_INITIALS.map((label) => (
          <Text
            key={label}
            style={{
              flex: 1,
              textAlign: 'center',
              color: colors.muted,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={{ flexDirection: 'row-reverse', gap: 4 }}>
            {week.map((cell, dayIndex) => {
              if (!cell.date) return <View key={dayIndex} style={{ flex: 1, height: 40 }} />;

              const isFuture = maxDate ? cell.date > maxDate : false;
              const pct = scores?.[cell.date];
              const { fill, accent } = scoreStyle(isFuture ? undefined : pct);
              const isSelected = cell.date === selectedDate;
              const isToday = cell.date === today;

              return (
                <View key={dayIndex} style={{ flex: 1, alignItems: 'center' }}>
                  <Pressable
                    onPress={() => !isFuture && onSelect(cell.date!)}
                    disabled={isFuture}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      backgroundColor: isSelected ? colors.primary : fill,
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: colors.text,
                      opacity: isFuture ? 0.3 : 1,
                      ...(isSelected ? shadows.card : null),
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.onPrimary : colors.text,
                        fontSize: 14,
                        fontWeight: isSelected || isToday ? '700' : '500',
                      }}
                    >
                      {cell.day}
                    </Text>
                    <View
                      style={{
                        width: 12,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: isSelected
                          ? colors.onPrimary
                          : accent ?? 'transparent',
                      }}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {scores && (
        <View
          style={{
            flexDirection: 'row-reverse',
            justifyContent: 'center',
            gap: spacing.md,
            paddingTop: 4,
          }}
        >
          <LegendDot color={colors.success} label="100%" />
          <LegendDot color={colors.primary} label="60%+" />
          <LegendDot color={colors.danger} label="מתחת ל-60%" />
        </View>
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
