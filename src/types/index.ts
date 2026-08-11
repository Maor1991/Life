export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type WorkoutIntensity = 'light' | 'moderate' | 'high' | 'very_high';

export interface Profile {
  id: number;
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  typicalIntensity: WorkoutIntensity;
  weeklyWorkoutTarget: number;
  sleepTargetHours: number;
  weightWorkout: number;
  weightSleep: number;
  weightNutrition: number;
}

export type NewProfile = Omit<Profile, 'id'>;

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

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

/** Per-day aggregate used by the daily score. */
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
}

export interface SavedMeal {
  id: number;
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
}

export interface DailyScoreBreakdown {
  date: string;
  workoutPct: number;
  sleepPct: number;
  nutritionPct: number;
  totalPct: number;
}
