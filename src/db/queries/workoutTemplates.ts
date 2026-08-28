import { supabase, unwrap } from '../client';
import type { WorkoutTemplate } from '../../types';

interface WorkoutTemplateRow {
  id: number;
  name: string;
  workout_type: string;
  muscle_groups: unknown;
}

function toTemplate(row: WorkoutTemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    workoutType: row.workout_type,
    muscleGroups: Array.isArray(row.muscle_groups) ? row.muscle_groups : [],
  };
}

export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const rows = unwrap(
    await supabase
      .from('workout_templates')
      .select('*')
      .order('name', { ascending: true })
      .returns<WorkoutTemplateRow[]>()
  );
  return rows.map(toTemplate);
}

export async function addWorkoutTemplate(template: Omit<WorkoutTemplate, 'id'>): Promise<number> {
  const row = unwrap(
    await supabase
      .from('workout_templates')
      .insert({
        name: template.name,
        workout_type: template.workoutType,
        muscle_groups: template.muscleGroups,
      })
      .select('id')
      .single<{ id: number }>()
  );
  return row.id;
}

export async function deleteWorkoutTemplate(id: number): Promise<void> {
  unwrap(await supabase.from('workout_templates').delete().eq('id', id));
}
