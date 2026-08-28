import { supabase, unwrap, unwrapRows } from '../client';
import type { WorkoutIntensity, WorkoutSession, WorkoutSessionWithSets, WorkoutSet } from '../../types';

interface SessionRow {
  id: number;
  date: string;
  notes: string | null;
  intensity: WorkoutIntensity;
  workout_type: string;
  muscle_groups: unknown;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  distance_km: number | null;
  duration_minutes: number | null;
  elevation_m: number | null;
  template_id: number | null;
}

interface SetRow {
  id: number;
  session_id: number;
  exercise_name: string;
  muscle_group: string | null;
  weight_kg: number;
  reps: number;
  set_number: number;
}

/** Sessions come back with their sets nested, so a day costs one round trip. */
type SessionWithSetsRow = SessionRow & { workout_sets: SetRow[] };

const SESSION_WITH_SETS = '*, workout_sets(*)';

function parseMuscles(raw: unknown): string[] {
  return Array.isArray(raw) ? raw : [];
}

function toSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    date: row.date,
    notes: row.notes,
    intensity: row.intensity,
    workoutType: row.workout_type,
    muscleGroups: parseMuscles(row.muscle_groups),
    avgHeartRate: row.avg_heart_rate,
    maxHeartRate: row.max_heart_rate,
    distanceKm: row.distance_km,
    durationMinutes: row.duration_minutes,
    elevationM: row.elevation_m,
    templateId: row.template_id,
  };
}

function toSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group ?? '',
    weightKg: row.weight_kg,
    reps: row.reps,
    setNumber: row.set_number,
  };
}

function toSessionWithSets(row: SessionWithSetsRow): WorkoutSessionWithSets {
  return { ...toSession(row), sets: (row.workout_sets ?? []).map(toSet) };
}

export interface NewSet {
  exerciseName: string;
  muscleGroup: string;
  weightKg: number;
  reps: number;
  setNumber: number;
}

export interface NewSession {
  date: string;
  notes: string | null;
  intensity: WorkoutIntensity;
  workoutType: string;
  muscleGroups: string[];
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  elevationM: number | null;
  sets: NewSet[];
  templateId?: number | null;
}

function toSessionPayload(session: NewSession) {
  return {
    date: session.date,
    notes: session.notes,
    intensity: session.intensity,
    workout_type: session.workoutType,
    muscle_groups: session.muscleGroups,
    avg_heart_rate: session.avgHeartRate,
    max_heart_rate: session.maxHeartRate,
    distance_km: session.distanceKm,
    duration_minutes: session.durationMinutes,
    elevation_m: session.elevationM,
    template_id: session.templateId ?? null,
  };
}

/** One insert for the whole set list instead of a statement per set. */
async function insertSets(sessionId: number, sets: NewSet[]): Promise<void> {
  if (sets.length === 0) return;
  unwrap(
    await supabase.from('workout_sets').insert(
      sets.map((set) => ({
        session_id: sessionId,
        exercise_name: set.exerciseName,
        muscle_group: set.muscleGroup,
        weight_kg: set.weightKg,
        reps: set.reps,
        set_number: set.setNumber,
      }))
    )
  );
}

export async function createSession(session: NewSession): Promise<number> {
  const row = unwrap(
    await supabase
      .from('workout_sessions')
      .insert(toSessionPayload(session))
      .select('id')
      .single<{ id: number }>()
  );
  await insertSets(row.id, session.sets);
  return row.id;
}

export async function updateSession(id: number, session: NewSession): Promise<void> {
  unwrap(await supabase.from('workout_sessions').update(toSessionPayload(session)).eq('id', id));
  unwrap(await supabase.from('workout_sets').delete().eq('session_id', id));
  await insertSets(id, session.sets);
}

export async function getSessions(): Promise<WorkoutSession[]> {
  const rows = unwrap(
    await supabase
      .from('workout_sessions')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .returns<SessionRow[]>()
  );
  return rows.map(toSession);
}

export async function getSessionsByDate(date: string): Promise<WorkoutSessionWithSets[]> {
  const rows = unwrap(
    await supabase
      .from('workout_sessions')
      .select(SESSION_WITH_SETS)
      .eq('date', date)
      .order('id', { ascending: false })
      .order('id', { referencedTable: 'workout_sets', ascending: true })
      .returns<SessionWithSetsRow[]>()
  );
  return rows.map(toSessionWithSets);
}

export async function getSessionWithSets(id: number): Promise<WorkoutSessionWithSets | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SESSION_WITH_SETS)
    .eq('id', id)
    .order('id', { referencedTable: 'workout_sets', ascending: true })
    .maybeSingle<SessionWithSetsRow>();
  if (error) throw new Error(error.message);
  return data ? toSessionWithSets(data) : null;
}

export async function deleteSession(id: number): Promise<void> {
  // workout_sets has ON DELETE CASCADE, so the sets go with the session.
  unwrap(await supabase.from('workout_sessions').delete().eq('id', id));
}

export async function getExerciseNames(): Promise<string[]> {
  const rows = unwrapRows<{ exercise_name: string }>(await supabase.rpc('exercise_names'));
  return rows.map((r) => r.exercise_name);
}

/** Previously used exercise names for a muscle, most recent first, for suggestions. */
export async function getExerciseNamesByMuscle(muscleGroup: string): Promise<string[]> {
  const rows = unwrapRows<{ exercise_name: string }>(
    await supabase.rpc('exercise_names_by_muscle', { p_muscle: muscleGroup })
  );
  return rows.map((r) => r.exercise_name);
}

export interface ExerciseHistoryPoint {
  date: string;
  maxWeightKg: number;
}

export async function getExerciseHistory(exerciseName: string): Promise<ExerciseHistoryPoint[]> {
  const rows = unwrapRows<{ date: string; max_weight: number }>(
    await supabase.rpc('exercise_history', { p_exercise: exerciseName })
  );
  return rows.map((r) => ({ date: r.date, maxWeightKg: r.max_weight }));
}
