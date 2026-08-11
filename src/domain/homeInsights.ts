import type {
  DailyScoreBreakdown,
  MacroTargets,
  Profile,
  SleepDaySummary,
  SleepSession,
  WorkoutSession,
} from '../types';
import { MUSCLE_GROUPS, muscleLabel } from './workoutTypes';
import { addDays, weekRange } from './dates';
import type { MacroSet } from './foods';

export interface MissingItem {
  domain: 'workout' | 'sleep' | 'nutrition';
  text: string;
  done: boolean;
}

/**
 * Turns today's gaps into concrete next actions instead of bare percentages.
 */
export function computeMissingToday(params: {
  profile: Profile;
  macroTargets: MacroTargets;
  todayMacros: MacroSet;
  todaySleepHours: number;
  hasSleepLog: boolean;
  workoutsThisWeek: number;
}): MissingItem[] {
  const { profile, macroTargets, todayMacros, todaySleepHours, hasSleepLog, workoutsThisWeek } =
    params;
  const items: MissingItem[] = [];

  const workoutsLeft = Math.max(0, profile.weeklyWorkoutTarget - workoutsThisWeek);
  items.push({
    domain: 'workout',
    done: workoutsLeft === 0,
    text:
      workoutsLeft === 0
        ? `השלמת את היעד השבועי — ${workoutsThisWeek} אימונים`
        : `עוד ${workoutsLeft} ${workoutsLeft === 1 ? 'אימון' : 'אימונים'} להשלמת היעד השבועי (${workoutsThisWeek}/${profile.weeklyWorkoutTarget})`,
  });

  const sleepLeft = Math.max(0, profile.sleepTargetHours - todaySleepHours);
  items.push({
    domain: 'sleep',
    done: hasSleepLog && sleepLeft <= 0,
    text: !hasSleepLog
      ? 'עוד לא רשמת שינה להיום'
      : sleepLeft <= 0
        ? `ישנת ${todaySleepHours.toFixed(1)} שעות — מעל היעד`
        : `חסרות ${sleepLeft.toFixed(1)} שעות שינה מהיעד`,
  });

  const proteinLeft = Math.max(0, macroTargets.proteinG - todayMacros.proteinG);
  const carbsLeft = Math.max(0, macroTargets.carbsG - todayMacros.carbsG);
  const fatLeft = Math.max(0, macroTargets.fatG - todayMacros.fatG);
  const allMet = proteinLeft === 0 && carbsLeft === 0 && fatLeft === 0;
  items.push({
    domain: 'nutrition',
    done: allMet,
    text: allMet
      ? 'השלמת את כל יעדי המאקרו להיום'
      : `נשארו ${Math.round(proteinLeft)} ג׳ חלבון · ${Math.round(carbsLeft)} ג׳ פחמימה · ${Math.round(fatLeft)} ג׳ שומן`,
  });

  return items;
}

export interface MuscleBalanceEntry {
  muscle: string;
  label: string;
  lastDate: string | null;
  daysSince: number | null;
  sessions30d: number;
}

/**
 * Highlights training imbalance — which muscles get attention and which are
 * quietly skipped week after week.
 */
export function computeMuscleBalance(
  sessions: WorkoutSession[],
  today: string
): MuscleBalanceEntry[] {
  const cutoff30 = addDays(today, -29);

  return MUSCLE_GROUPS.map(({ value }) => {
    let lastDate: string | null = null;
    let sessions30d = 0;

    for (const session of sessions) {
      if (!session.muscleGroups.includes(value)) continue;
      if (!lastDate || session.date > lastDate) lastDate = session.date;
      if (session.date >= cutoff30 && session.date <= today) sessions30d += 1;
    }

    return {
      muscle: value,
      label: muscleLabel(value),
      lastDate,
      daysSince: lastDate ? daysBetween(lastDate, today) : null,
      sessions30d,
    };
  }).sort((a, b) => {
    // Most neglected first: never trained, then longest since last session.
    if (a.daysSince === null && b.daysSince === null) return 0;
    if (a.daysSince === null) return -1;
    if (b.daysSince === null) return 1;
    return b.daysSince - a.daysSince;
  });
}

function daysBetween(from: string, to: string): number {
  let count = 0;
  let cursor = from;
  while (cursor < to) {
    cursor = addDays(cursor, 1);
    count += 1;
  }
  return count;
}

export interface WeekStats {
  workouts: number;
  avgSleepHours: number | null;
  avgScore: number | null;
}

export interface WeekComparison {
  thisWeek: WeekStats;
  lastWeek: WeekStats;
}

function statsForRange(
  start: string,
  end: string,
  sessions: WorkoutSession[],
  sleep: SleepDaySummary[],
  scores: DailyScoreBreakdown[]
): WeekStats {
  const workouts = sessions.filter((s) => s.date >= start && s.date <= end).length;

  const sleepInRange = sleep.filter((s) => s.date >= start && s.date <= end);
  const avgSleepHours = sleepInRange.length
    ? sleepInRange.reduce((sum, s) => sum + s.hours, 0) / sleepInRange.length
    : null;

  const scoresInRange = scores.filter((s) => s.date >= start && s.date <= end);
  const avgScore = scoresInRange.length
    ? scoresInRange.reduce((sum, s) => sum + s.totalPct, 0) / scoresInRange.length
    : null;

  return { workouts, avgSleepHours, avgScore };
}

export function computeWeekComparison(
  sessions: WorkoutSession[],
  sleep: SleepDaySummary[],
  scores: DailyScoreBreakdown[],
  today: string
): WeekComparison {
  const [monday] = weekRange(today);
  const lastMonday = addDays(monday, -7);
  const lastSunday = addDays(monday, -1);

  return {
    thisWeek: statsForRange(monday, today, sessions, sleep, scores),
    lastWeek: statsForRange(lastMonday, lastSunday, sessions, sleep, scores),
  };
}

export interface DaySleepInfo {
  sessions: SleepSession[];
  totalHours: number;
}

export function summarizeSleepSessions(sessions: SleepSession[]): DaySleepInfo {
  return {
    sessions,
    totalHours: sessions.reduce((sum, s) => sum + s.hours, 0),
  };
}
