import type { ActivityLevel, WorkoutIntensity } from '../types';
import { addDays } from './dates';

export const WORKOUT_INTENSITY_OPTIONS: { label: string; value: WorkoutIntensity }[] = [
  { label: 'קלה', value: 'light' },
  { label: 'בינונית', value: 'moderate' },
  { label: 'גבוהה', value: 'high' },
  { label: 'גבוהה מאוד', value: 'very_high' },
];

/**
 * Relative caloric-load weight per intensity tier, calibrated so "moderate"
 * (weight 1.0) reproduces the original frequency-only thresholds. Lets
 * frequent-but-light training (e.g. 6-7x/week walking) land as "moderate"
 * instead of being conflated with frequent-and-hard training.
 */
const INTENSITY_WEIGHT: Record<WorkoutIntensity, number> = {
  light: 0.6,
  moderate: 1.0,
  high: 1.4,
  very_high: 1.8,
};

function levelFromLoadScore(loadScore: number): ActivityLevel {
  if (loadScore < 1) return 'sedentary';
  if (loadScore < 3.5) return 'light';
  if (loadScore < 5.5) return 'moderate';
  if (loadScore < 7) return 'active';
  return 'very_active';
}

/**
 * Planned counterpart to computeActivityStatus: turns the user's intended
 * weekly frequency and typical intensity into an activity level, so the
 * nutrition plan reflects both axes rather than frequency alone.
 */
export function deriveActivityLevel(
  weeklyFrequency: number,
  intensity: WorkoutIntensity
): ActivityLevel {
  return levelFromLoadScore(weeklyFrequency * INTENSITY_WEIGHT[intensity]);
}

function closestIntensity(weight: number): WorkoutIntensity {
  let best: WorkoutIntensity = 'moderate';
  let bestDiff = Infinity;
  for (const key of Object.keys(INTENSITY_WEIGHT) as WorkoutIntensity[]) {
    const diff = Math.abs(INTENSITY_WEIGHT[key] - weight);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = key;
    }
  }
  return best;
}

export interface WorkoutLogEntry {
  date: string;
  intensity: WorkoutIntensity;
}

export interface ActivityStatus {
  windowLabel: string;
  windowDays: number;
  sessionCount: number;
  avgSessionsPerWeek: number;
  dominantIntensity: WorkoutIntensity;
  doubleSessionDays: number;
  level: ActivityLevel;
}

/**
 * Derives an activity level from real logged workouts (frequency + intensity)
 * over a trailing window, instead of relying only on the self-reported
 * profile field.
 */
export function computeActivityStatus(
  sessions: WorkoutLogEntry[],
  today: string,
  windowDays: number,
  windowLabel: string
): ActivityStatus | null {
  const cutoff = addDays(today, -(windowDays - 1));
  const inWindow = sessions.filter((s) => s.date >= cutoff && s.date <= today);
  if (inWindow.length === 0) return null;

  const countByDate: Record<string, number> = {};
  for (const s of inWindow) countByDate[s.date] = (countByDate[s.date] ?? 0) + 1;
  const doubleSessionDays = Object.values(countByDate).filter((c) => c >= 2).length;

  const avgSessionsPerWeek = (inWindow.length / windowDays) * 7;
  const avgWeight = inWindow.reduce((sum, s) => sum + INTENSITY_WEIGHT[s.intensity], 0) / inWindow.length;
  const dominantIntensity = closestIntensity(avgWeight);

  const loadScore = avgSessionsPerWeek * avgWeight + doubleSessionDays * 0.3;
  const level = levelFromLoadScore(loadScore);

  return {
    windowLabel,
    windowDays,
    sessionCount: inWindow.length,
    avgSessionsPerWeek,
    dominantIntensity,
    doubleSessionDays,
    level,
  };
}

export interface ActivityStatusWindows {
  week: ActivityStatus | null;
  month: ActivityStatus | null;
  year: ActivityStatus | null;
}

export function computeActivityStatusWindows(
  sessions: WorkoutLogEntry[],
  today: string
): ActivityStatusWindows {
  return {
    week: computeActivityStatus(sessions, today, 7, 'השבוע האחרון'),
    month: computeActivityStatus(sessions, today, 30, '30 הימים האחרונים'),
    year: computeActivityStatus(sessions, today, 365, 'השנה האחרונה'),
  };
}
