import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'life.progressWeights';

export interface ProgressWeights {
  workout: number;
  sleep: number;
  nutrition: number;
}

export const DEFAULT_PROGRESS_WEIGHTS: ProgressWeights = { workout: 0.3, sleep: 0.3, nutrition: 0.4 };

function isValidWeights(value: unknown): value is ProgressWeights {
  if (!value || typeof value !== 'object') return false;
  const w = value as Partial<ProgressWeights>;
  return typeof w.workout === 'number' && typeof w.sleep === 'number' && typeof w.nutrition === 'number';
}

/**
 * Redistributes the remaining share across the other two keys proportional
 * to their current ratio — the standard "three sliders that sum to 100%"
 * balance, so nudging one never breaks the total.
 */
export function rebalanceWeights(
  weights: ProgressWeights,
  changed: keyof ProgressWeights,
  value: number
): ProgressWeights {
  const clamped = Math.max(0, Math.min(1, value));
  const others = (Object.keys(weights) as (keyof ProgressWeights)[]).filter((k) => k !== changed);
  const remaining = 1 - clamped;
  const otherSum = others.reduce((sum, k) => sum + weights[k], 0);

  const next = { ...weights, [changed]: clamped } as ProgressWeights;
  others.forEach((k) => {
    next[k] = otherSum > 0 ? (weights[k] / otherSum) * remaining : remaining / others.length;
  });
  return next;
}

/** Persists the user's chosen workout/sleep/nutrition weighting for computeDayPct, shared across Home, the calendar, and the progress chart. */
export function useProgressWeights() {
  const [weights, setWeightsState] = useState<ProgressWeights>(DEFAULT_PROGRESS_WEIGHTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (isValidWeights(parsed)) setWeightsState(parsed);
        } catch {
          // Corrupt/old value — fall back to defaults.
        }
      }
      setLoaded(true);
    });
  }, []);

  const setWeights = useCallback((next: ProgressWeights) => {
    setWeightsState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { weights, setWeights, loaded };
}
