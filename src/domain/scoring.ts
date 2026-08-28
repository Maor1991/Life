const GRACE_WINDOW_DAYS = 7;

/**
 * Counts consecutive days (most recent first) where totalPct reached the
 * threshold, with one "protected" miss forgiven per rolling 7-day window —
 * a single off day doesn't wipe out weeks of consistency. A forgiven day
 * doesn't add to the count itself, but doesn't break the chain either; a
 * second miss inside the same window still ends the streak.
 */
export function computeStreak(
  scoresMostRecentFirst: { totalPct: number }[],
  threshold = 99.5
): number {
  let streak = 0;
  let graceUsedForWindow = -1;
  for (let i = 0; i < scoresMostRecentFirst.length; i++) {
    if (scoresMostRecentFirst[i].totalPct >= threshold) {
      streak += 1;
      continue;
    }
    const window = Math.floor(i / GRACE_WINDOW_DAYS);
    if (window !== graceUsedForWindow) {
      graceUsedForWindow = window;
      continue;
    }
    break;
  }
  return streak;
}
