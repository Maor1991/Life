import type { WorkoutIntensity } from '../types';

export const GYM_TYPE = 'חדר כושר';

export const WORKOUT_TYPES: string[] = [
  GYM_TYPE,
  'ריצה',
  'שחייה',
  'אופניים',
  'הליכה',
  'קרוספיט',
  'יוגה',
  'משחק כדור',
];

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'biceps'
  | 'triceps'
  | 'shoulders'
  | 'legs'
  | 'abs';

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest', label: 'חזה' },
  { value: 'back', label: 'גב' },
  { value: 'biceps', label: 'יד קדמית' },
  { value: 'triceps', label: 'יד אחורית' },
  { value: 'shoulders', label: 'כתפיים' },
  { value: 'legs', label: 'רגליים' },
  { value: 'abs', label: 'בטן' },
];

export function muscleLabel(muscle: string): string {
  return MUSCLE_GROUPS.find((m) => m.value === muscle)?.label ?? muscle;
}

export interface WorkoutIntensityTier {
  value: WorkoutIntensity;
  label: string;
  rpe: string;
  description: string;
}

/**
 * Same talk-test anchors used for the activity plan, phrased for a single
 * session so the rating stays consistent between workouts.
 */
export const WORKOUT_INTENSITY_TIERS: WorkoutIntensityTier[] = [
  {
    value: 'light',
    label: 'קלה',
    rpe: '1-3',
    description: 'מאמץ קל, אפשר לדבר בקלות ואפילו לשיר. חימום, מתיחות, הליכה נינוחה.',
  },
  {
    value: 'moderate',
    label: 'בינונית',
    rpe: '4-6',
    description: 'אפשר לדבר במשפטים מלאים. אימון בקצב סדיר, רחוק מכשל, נשימה מוגברת אבל נוחה.',
  },
  {
    value: 'high',
    label: 'גבוהה',
    rpe: '7-8',
    description: 'אפשר להגיד רק כמה מילים ברצף. סטים כבדים קרוב לכשל, אינטרוולים, HIIT.',
  },
  {
    value: 'very_high',
    label: 'גבוהה מאוד',
    rpe: '9-10',
    description: 'אי אפשר לדבר. מאמץ מקסימלי — ספרינטים, סטים עד כשל, תחרות.',
  },
];
