import type { SleepKind, SleepQuality } from '../types';

export interface SleepQualityTier {
  value: SleepQuality;
  label: string;
}

/**
 * Plain-language anchors for the 1-5 scale, so the rating means the same
 * thing from night to night instead of drifting with mood. Title/description
 * text lives in the translations dictionary, keyed by `value`.
 */
export const SLEEP_QUALITY_TIERS: SleepQualityTier[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

export function sleepQualityTitle(value: SleepQuality, t: (key: string) => string): string {
  return t(`sleepQuality.${value}.title`);
}

export function sleepQualityDescription(value: SleepQuality, t: (key: string) => string): string {
  return t(`sleepQuality.${value}.description`);
}

export const SLEEP_KIND_VALUES: SleepKind[] = ['night', 'nap'];

export function sleepKindLabel(kind: SleepKind, t: (key: string) => string): string {
  return t(`sleepKind.${kind}`);
}

export function getSleepKindOptions(
  t: (key: string) => string
): { value: SleepKind; label: string }[] {
  return SLEEP_KIND_VALUES.map((value) => ({ value, label: sleepKindLabel(value, t) }));
}

export function formatHours(hours: number, t: (key: string) => string): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  const min = t('sleep.minutesShort');
  const hr = t('sleep.hoursShort');
  if (whole === 0) return `${minutes} ${min}`;
  if (minutes === 0) return `${whole} ${hr}`;
  return `${whole} ${hr} ${minutes} ${min}`;
}
