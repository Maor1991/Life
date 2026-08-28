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

/** Sentinel value for a free-text workout type the user typed in themselves. */
export const OTHER_TYPE = 'אחר';

/** Also a real WORKOUT_TYPES entry — the Home week tracker reuses it verbatim for a walk session. */
export const WALK_TYPE = 'הליכה';
/** Not a selectable WORKOUT_TYPES entry — the Home week tracker's "day off" sentinel. */
export const REST_TYPE = 'חופש';

/** Maps the (Hebrew, stored-as-data) workout type value to its translation key suffix. */
const WORKOUT_TYPE_KEYS: Record<string, string> = {
  [GYM_TYPE]: 'gym',
  ריצה: 'running',
  שחייה: 'swimming',
  אופניים: 'cycling',
  [WALK_TYPE]: 'walking',
  קרוספיט: 'crossfit',
  יוגה: 'yoga',
  'משחק כדור': 'ballGame',
  [OTHER_TYPE]: 'other',
  [REST_TYPE]: 'dayOff',
};

/** Display label for a stored workout type. Custom user-typed types pass through unchanged. */
export function workoutTypeLabel(type: string, t: (key: string) => string): string {
  const key = WORKOUT_TYPE_KEYS[type];
  return key ? t(`workoutType.${key}`) : type;
}

/**
 * One-line summary for a logged session: type plus distance (for
 * distance-based activities) or muscle groups trained, matching the label
 * shown for workout templates elsewhere in the app.
 */
export function sessionSummaryLabel(
  session: { workoutType: string; muscleGroups: string[]; distanceKm?: number | null },
  t: (key: string) => string
): string {
  const typeLabel = workoutTypeLabel(session.workoutType, t);
  if (session.distanceKm != null && session.distanceKm > 0) {
    return `${typeLabel} · ${session.distanceKm} ${t('cardio.kmUnit')}`;
  }
  if (session.muscleGroups.length === 0) return typeLabel;
  const muscles = session.muscleGroups.map((m) => muscleLabel(m, t)).join(', ');
  return `${typeLabel} : ${muscles}`;
}

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

export function muscleLabel(muscle: string, t: (key: string) => string): string {
  return t(`muscle.${muscle}`);
}

/**
 * Simplified 5-muscle set for the Home week tracker — one pick per day,
 * unlike the full 7-group list above used for per-exercise tracking. Each
 * pick stores real MUSCLE_GROUPS keys (never a separate representation),
 * so a quick pick shows up correctly everywhere sessions are read — Muscle
 * Balance, My Week, the day view — not just inside this widget. "Arms"
 * covers both biceps and triceps, since the quick picker doesn't split them.
 */
export type QuickMuscle = 'chest' | 'back' | 'arms' | 'shoulders' | 'legs';

const QUICK_MUSCLE_GROUPS: Record<QuickMuscle, MuscleGroup[]> = {
  chest: ['chest'],
  back: ['back'],
  arms: ['biceps', 'triceps'],
  shoulders: ['shoulders'],
  legs: ['legs'],
};

const QUICK_MUSCLE_ORDER: QuickMuscle[] = ['chest', 'back', 'arms', 'shoulders', 'legs'];

export function quickMuscleLabel(pick: QuickMuscle, t: (key: string) => string): string {
  return t(`muscle.${pick}`);
}

export function getQuickMuscleOptions(
  t: (key: string) => string
): { value: QuickMuscle; label: string }[] {
  return QUICK_MUSCLE_ORDER.map((m) => ({ value: m, label: quickMuscleLabel(m, t) }));
}

/** The real muscle-group keys to store in `workout_sessions.muscle_groups` for a quick pick. */
export function quickMuscleGroups(pick: QuickMuscle): MuscleGroup[] {
  return QUICK_MUSCLE_GROUPS[pick];
}

/** Which quick pick (if any) a stored muscleGroups array matches exactly — used to identify a widget-owned session. */
export function quickMuscleFromGroups(groups: string[]): QuickMuscle | null {
  const set = new Set(groups);
  for (const pick of QUICK_MUSCLE_ORDER) {
    const target = QUICK_MUSCLE_GROUPS[pick];
    if (target.length === set.size && target.every((g) => set.has(g))) return pick;
  }
  return null;
}

/** Localized {value,label} pairs for MultiPillSelect. */
export function getMuscleGroupOptions(
  t: (key: string) => string
): { value: MuscleGroup; label: string }[] {
  return MUSCLE_GROUPS.map((m) => ({ value: m.value, label: muscleLabel(m.value, t) }));
}

export interface WorkoutIntensityTier {
  value: WorkoutIntensity;
  rpe: string;
}

/**
 * Same talk-test anchors used for the activity plan, phrased for a single
 * session so the rating stays consistent between workouts. Label/description
 * text lives in the translations dictionary, keyed by `value`.
 */
export const WORKOUT_INTENSITY_TIERS: WorkoutIntensityTier[] = [
  { value: 'light', rpe: '1-3' },
  { value: 'moderate', rpe: '4-6' },
  { value: 'high', rpe: '7-8' },
  { value: 'very_high', rpe: '9-10' },
];

export function workoutIntensityLabel(
  intensity: WorkoutIntensity,
  t: (key: string) => string
): string {
  return t(`intensity.${intensity}`);
}

export function getWorkoutIntensityOptions(
  t: (key: string) => string
): { value: WorkoutIntensity; label: string }[] {
  return WORKOUT_INTENSITY_TIERS.map((tier) => ({
    value: tier.value,
    label: workoutIntensityLabel(tier.value, t),
  }));
}
