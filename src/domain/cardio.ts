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
  paceKind: PaceKind;
  showElevation: boolean;
}

const DISTANCE_CONFIG: Record<string, DistanceConfig> = {
  ריצה: { distanceUnit: 'km', paceKind: 'min_per_km', showElevation: true },
  הליכה: { distanceUnit: 'km', paceKind: 'min_per_km', showElevation: true },
  אופניים: { distanceUnit: 'km', paceKind: 'kmh', showElevation: true },
  שחייה: { distanceUnit: 'm', paceKind: 'min_per_100m', showElevation: false },
};

export function getActivityKind(workoutType: string): ActivityKind {
  if (workoutType === GYM_TYPE) return 'gym';
  return DISTANCE_CONFIG[workoutType] ? 'distance' : 'duration';
}

/** Null for activities where distance has no meaning. */
export function getDistanceConfig(workoutType: string): DistanceConfig | null {
  return DISTANCE_CONFIG[workoutType] ?? null;
}

export function distanceFieldLabel(config: DistanceConfig, t: (key: string) => string): string {
  return config.distanceUnit === 'm' ? t('cardio.distanceMeters') : t('cardio.distanceKm');
}

export function paceFieldLabel(config: DistanceConfig, t: (key: string) => string): string {
  return config.paceKind === 'kmh' ? t('cardio.avgSpeed') : t('cardio.pace');
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
  paceKind: PaceKind,
  t: (key: string) => string
): string | null {
  if (!distanceKm || !durationMinutes || distanceKm <= 0 || durationMinutes <= 0) return null;

  if (paceKind === 'kmh') {
    return `${(distanceKm / (durationMinutes / 60)).toFixed(1)} ${t('cardio.kmhUnit')}`;
  }
  if (paceKind === 'min_per_100m') {
    return `${formatMinutesPer(durationMinutes / (distanceKm * 10))} ${t('cardio.minPer100m')}`;
  }
  return `${formatMinutesPer(durationMinutes / distanceKm)} ${t('cardio.minPerKm')}`;
}

export function formatDuration(minutes: number | null, t: (key: string) => string): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} ${t('sleep.minutesShort')}`;
  return `${hours}:${String(mins).padStart(2, '0')} ${t('sleep.hoursShort')}`;
}

export function formatDistance(
  distanceKm: number,
  workoutType: string,
  t: (key: string) => string
): string {
  const config = getDistanceConfig(workoutType);
  if (config?.distanceUnit === 'm') return `${Math.round(distanceKm * 1000)} ${t('cardio.mUnit')}`;
  return `${distanceKm} ${t('cardio.kmUnit')}`;
}
