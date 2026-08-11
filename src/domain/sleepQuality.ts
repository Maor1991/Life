import type { SleepKind, SleepQuality } from '../types';

export interface SleepQualityTier {
  value: SleepQuality;
  label: string;
  title: string;
  description: string;
}

/**
 * Plain-language anchors for the 1-5 scale, so the rating means the same
 * thing from night to night instead of drifting with mood.
 */
export const SLEEP_QUALITY_TIERS: SleepQualityTier[] = [
  {
    value: 1,
    label: '1',
    title: 'גרועה מאוד',
    description: 'התעוררתי הרבה פעמים או כמעט לא נרדמתי. קמתי מותש לגמרי.',
  },
  {
    value: 2,
    label: '2',
    title: 'גרועה',
    description: 'התעוררתי כמה פעמים או התקשיתי להירדם. קמתי עייף.',
  },
  {
    value: 3,
    label: '3',
    title: 'בינונית',
    description: 'ישנתי פחות או יותר רצוף, אולי יקיצה אחת. קמתי סביר, לא רענן.',
  },
  {
    value: 4,
    label: '4',
    title: 'טובה',
    description: 'נרדמתי בקלות וישנתי כמעט בלי הפרעות. קמתי רענן.',
  },
  {
    value: 5,
    label: '5',
    title: 'מצוינת',
    description: 'שינה רצופה ועמוקה. קמתי מלא אנרגיה, בלי צורך בנודניק.',
  },
];

export const SLEEP_KIND_OPTIONS: { label: string; value: SleepKind }[] = [
  { label: 'שינת לילה', value: 'night' },
  { label: 'תנומה', value: 'nap' },
];

export function sleepKindLabel(kind: SleepKind): string {
  return SLEEP_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0) return `${minutes} דק׳`;
  if (minutes === 0) return `${whole} שע׳`;
  return `${whole} שע׳ ${minutes} דק׳`;
}
