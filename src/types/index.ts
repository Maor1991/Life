export type WorkoutIntensity = 'light' | 'moderate' | 'high' | 'very_high';

export interface WorkoutSession {
  id: number;
  date: string; // YYYY-MM-DD
  notes: string | null;
  intensity: WorkoutIntensity;
  /** Main title of the session, e.g. "חדר כושר", "ריצה". */
  workoutType: string;
  /** Muscle groups trained, kept even before exercises are filled in. */
  muscleGroups: string[];
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  /** Endurance metrics. Distance is always stored in kilometres. */
  distanceKm: number | null;
  durationMinutes: number | null;
  elevationM: number | null;
  /** Set when this session was created by checking off a workout template on Home. */
  templateId: number | null;
}

export interface WorkoutSet {
  id: number;
  sessionId: number;
  exerciseName: string;
  muscleGroup: string;
  weightKg: number;
  reps: number;
  setNumber: number;
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: WorkoutSet[];
}

/** A saved workout routine, defined once in Settings and checked off daily on Home. */
export interface WorkoutTemplate {
  id: number;
  name: string;
  workoutType: string;
  muscleGroups: string[];
}

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export type SleepKind = 'night' | 'nap';

/** A single stretch of sleep. A day can hold several (night sleep plus naps). */
export interface SleepSession {
  id: number;
  date: string; // YYYY-MM-DD
  kind: SleepKind;
  hours: number;
  quality: SleepQuality;
}

/** Per-day aggregate, used only to check which past dates have sleep logged. */
export interface SleepDaySummary {
  date: string;
  hours: number;
  quality: number;
}

/** One food entry inside a meal: a chosen measure, how many of it, and the resolved weight. */
export interface MealItem {
  foodId: string;
  name: string;
  portionLabel: string;
  quantity: number;
  grams: number;
}

export interface Meal {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
  /** Set when this meal was created by checking off a saved meal on Home. */
  savedMealId: number | null;
}

export interface SavedMeal {
  id: number;
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
}
