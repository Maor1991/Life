import type { WorkoutIntensity } from '../types';
import { GYM_TYPE } from './workoutTypes';

export type PaceKind = 'min_per_km' | 'kmh' | 'min_per_100m';

/**
 * How a session is measured:
 * - gym: sets and reps per muscle group
 * - distance: covers ground, so distance + time + pace make sense
 * - duration: effort over time only (yoga, crossfit, ball games) — distance
 *   and pace would be meaningless here
 */
export type ActivityKind = 'gym' | 'distance' | 'duration';

export interface DistanceConfig {
  /** Unit the user types distance in. Stored value is always kilometres. */
  distanceUnit: 'km' | 'm';
  distanceLabel: string;
  paceKind: PaceKind;
  paceLabel: string;
  showElevation: boolean;
}

const DISTANCE_CONFIG: Record<string, DistanceConfig> = {
  ריצה: {
    distanceUnit: 'km',
    distanceLabel: 'מרחק (ק״מ)',
    paceKind: 'min_per_km',
    paceLabel: 'קצב',
    showElevation: true,
  },
  הליכה: {
    distanceUnit: 'km',
    distanceLabel: 'מרחק (ק״מ)',
    paceKind: 'min_per_km',
    paceLabel: 'קצב',
    showElevation: true,
  },
  אופניים: {
    distanceUnit: 'km',
    distanceLabel: 'מרחק (ק״מ)',
    paceKind: 'kmh',
    paceLabel: 'מהירות ממוצעת',
    showElevation: true,
  },
  שחייה: {
    distanceUnit: 'm',
    distanceLabel: 'מרחק (מטרים)',
    paceKind: 'min_per_100m',
    paceLabel: 'קצב',
    showElevation: false,
  },
};

export function getActivityKind(workoutType: string): ActivityKind {
  if (workoutType === GYM_TYPE) return 'gym';
  return DISTANCE_CONFIG[workoutType] ? 'distance' : 'duration';
}

/** Null for activities where distance has no meaning. */
export function getDistanceConfig(workoutType: string): DistanceConfig | null {
  return DISTANCE_CONFIG[workoutType] ?? null;
}

function formatMinutesPer(value: number): string {
  const minutes = Math.floor(value);
  const seconds = Math.round((value - minutes) * 60);
  if (seconds === 60) return `${minutes + 1}:00`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Returns a display-ready pace/speed, or null when inputs are missing. */
export function formatPace(
  distanceKm: number | null,
  durationMinutes: number | null,
  paceKind: PaceKind
): string | null {
  if (!distanceKm || !durationMinutes || distanceKm <= 0 || durationMinutes <= 0) return null;

  if (paceKind === 'kmh') {
    return `${(distanceKm / (durationMinutes / 60)).toFixed(1)} קמ״ש`;
  }
  if (paceKind === 'min_per_100m') {
    return `${formatMinutesPer(durationMinutes / (distanceKm * 10))} דק׳ / 100מ׳`;
  }
  return `${formatMinutesPer(durationMinutes / distanceKm)} דק׳ / ק״מ`;
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} דק׳`;
  return `${hours}:${String(mins).padStart(2, '0')} שע׳`;
}

export function formatDistance(distanceKm: number, workoutType: string): string {
  const config = getDistanceConfig(workoutType);
  if (config?.distanceUnit === 'm') return `${Math.round(distanceKm * 1000)} מ׳`;
  return `${distanceKm} ק״מ`;
}

/**
 * MET values per activity and effort level. Calories follow the standard
 * MET formula: kcal = MET x body weight (kg) x hours.
 */
const MET_TABLE: Record<string, Record<WorkoutIntensity, number>> = {
  ריצה: { light: 6, moderate: 9, high: 11, very_high: 14 },
  הליכה: { light: 2.5, moderate: 3.5, high: 4.5, very_high: 6 },
  אופניים: { light: 4, moderate: 8, high: 10, very_high: 14 },
  שחייה: { light: 4, moderate: 6, high: 8, very_high: 10 },
  קרוספיט: { light: 5, moderate: 8, high: 10, very_high: 12 },
  יוגה: { light: 2.5, moderate: 3, high: 4, very_high: 5 },
  'משחק כדור': { light: 4, moderate: 6, high: 8, very_high: 10 },
  [GYM_TYPE]: { light: 3, moderate: 5, high: 6, very_high: 8 },
};

const DEFAULT_MET: Record<WorkoutIntensity, number> = {
  light: 3,
  moderate: 5,
  high: 7,
  very_high: 9,
};

export function estimateCalories(
  workoutType: string,
  intensity: WorkoutIntensity,
  durationMinutes: number | null,
  weightKg: number | null
): number | null {
  if (!durationMinutes || durationMinutes <= 0 || !weightKg || weightKg <= 0) return null;
  const met = (MET_TABLE[workoutType] ?? DEFAULT_MET)[intensity];
  return Math.round(met * weightKg * (durationMinutes / 60));
}
