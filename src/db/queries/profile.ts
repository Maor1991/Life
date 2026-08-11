import { supabase, unwrap } from '../client';
import type { NewProfile, Profile } from '../../types';

interface ProfileRow {
  id: number;
  height_cm: number;
  weight_kg: number;
  age: number;
  sex: string;
  activity_level: string;
  typical_intensity: string;
  weekly_workout_target: number;
  sleep_target_hours: number;
  weight_workout: number;
  weight_sleep: number;
  weight_nutrition: number;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    age: row.age,
    sex: row.sex as Profile['sex'],
    activityLevel: row.activity_level as Profile['activityLevel'],
    typicalIntensity: row.typical_intensity as Profile['typicalIntensity'],
    weeklyWorkoutTarget: row.weekly_workout_target,
    sleepTargetHours: row.sleep_target_hours,
    weightWorkout: row.weight_workout,
    weightSleep: row.weight_sleep,
    weightNutrition: row.weight_nutrition,
  };
}

export async function getProfile(): Promise<Profile | null> {
  // RLS narrows this to the signed-in user, so there is at most one row.
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .maybeSingle<ProfileRow>();
  if (error) throw new Error(error.message);
  return data ? toProfile(data) : null;
}

export async function saveProfile(profile: NewProfile): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Not signed in');

  unwrap(
    await supabase.from('profile').upsert(
      {
        user_id: userId,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        age: profile.age,
        sex: profile.sex,
        activity_level: profile.activityLevel,
        typical_intensity: profile.typicalIntensity,
        weekly_workout_target: profile.weeklyWorkoutTarget,
        sleep_target_hours: profile.sleepTargetHours,
        weight_workout: profile.weightWorkout,
        weight_sleep: profile.weightSleep,
        weight_nutrition: profile.weightNutrition,
      },
      { onConflict: 'user_id' }
    )
  );
}
