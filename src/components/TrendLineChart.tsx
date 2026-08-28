import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { LineChart, yAxisSides } from 'react-native-gifted-charts';
import { Card, PillSelect, SectionTitle } from './ui';
import { colors, spacing } from './theme';
import { useLanguage } from '../hooks/useLanguage';
import { addDays, today as todayFn } from '../domain/dates';

type RangeKey = '1W' | '1M' | '3M' | '6M' | '1Y';

const RANGE_DAYS: Record<RangeKey, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 182, '1Y': 365 };
const RANGE_OPTIONS: { label: string; value: RangeKey }[] = [
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
];
export const MAX_RANGE_DAYS = RANGE_DAYS['1Y'];
const TARGET_X_LABELS = 6;
const Y_AXIS_LABEL_WIDTH = 40;

export function lastDates(count: number): string[] {
  const today = todayFn();
  return Array.from({ length: count }, (_, i) => addDays(today, -(count - 1 - i)));
}

function formatAxisLabel(date: string): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`;
}

/**
 * Stock-app style metric card: a range picker (1W/1M/3M/6M/1Y), a big
 * current value with a delta vs. the start of the selected range, and an
 * area line sized to fill the card exactly (measured via onLayout, not
 * guessed) with the value axis on the right, Yahoo-Finance style.
 */
export function TrendLineChart({
  title,
  subtitle,
  valuesByDate,
  maxValue,
  suffix = '',
  formatValue = (v: number) => String(Math.round(v)),
  defaultRange = '1M',
  footer,
}: {
  title: string;
  subtitle?: string;
  /** Keyed by 'YYYY-MM-DD', covering at least the widest selectable range (365 days). */
  valuesByDate: Record<string, number>;
  /** Fixed y-axis ceiling (e.g. 100 for a percent score); omit to auto-scale to the data. */
  maxValue?: number;
  suffix?: string;
  formatValue?: (value: number) => string;
  defaultRange?: RangeKey;
  /** Extra content under the range picker — e.g. the progress chart's weight sliders. */
  footer?: React.ReactNode;
}) {
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [chartWidth, setChartWidth] = useState(0);

  const rangeDays = RANGE_DAYS[range];
  const dates = useMemo(() => lastDates(rangeDays), [rangeDays]);
  const labelEvery = Math.max(1, Math.ceil(dates.length / TARGET_X_LABELS));
  const data = useMemo(
    () =>
      dates.map((date, i) => ({
        value: valuesByDate[date] ?? 0,
        label: i % labelEvery === 0 || i === dates.length - 1 ? formatAxisLabel(date) : '',
      })),
    [dates, valuesByDate, labelEvery]
  );
  const hasData = Object.keys(valuesByDate).length > 0;

  const currentValue = valuesByDate[todayFn()] ?? 0;
  const rangeStartValue = valuesByDate[dates[0]] ?? 0;
  const delta = Math.round(currentValue - rangeStartValue);

  // Fill the card exactly: subtract the axis label gutter, then split what's left evenly.
  const plotWidth = Math.max(0, chartWidth - Y_AXIS_LABEL_WIDTH - 8);
  const spacing_ = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {subtitle && (
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>{subtitle}</Text>
      )}

      {hasData ? (
        <>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}>
              {formatValue(currentValue)}
              {suffix}
            </Text>
            <Text
              style={{
                color: delta > 0 ? colors.success : delta < 0 ? colors.danger : colors.muted,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta)}
              {suffix}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{t('trends.vsRangeStart')}</Text>
          </View>

          <View style={{ paddingTop: spacing.sm }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
            {chartWidth > 0 && (
              <LineChart
                data={data}
                color={delta >= 0 ? colors.success : colors.danger}
                thickness={2.5}
                curved
                areaChart
                startFillColor={delta >= 0 ? colors.success : colors.danger}
                endFillColor={colors.background}
                startOpacity={0.35}
                endOpacity={0.02}
                hideDataPoints
                yAxisSide={yAxisSides.RIGHT}
                yAxisLabelSuffix={suffix}
                yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                yAxisTextStyle={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}
                xAxisLabelTextStyle={{ color: colors.muted, fontSize: 9 }}
                xAxisColor={colors.border}
                yAxisColor="transparent"
                rulesColor={colors.border}
                rulesType="dashed"
                dashWidth={4}
                dashGap={4}
                {...(maxValue != null ? { maxValue } : {})}
                noOfSections={5}
                initialSpacing={4}
                endSpacing={0}
                spacing={spacing_}
                height={200}
              />
            )}
          </View>

          <PillSelect options={RANGE_OPTIONS} value={range} onChange={setRange} />
          {footer}
        </>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: align, paddingVertical: spacing.md }}>
          {t('trends.noData')}
        </Text>
      )}
    </Card>
  );
}
