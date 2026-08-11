import { supabase, unwrap } from '../client';
import type { Meal, MealItem, SavedMeal } from '../../types';

interface MealRow {
  id: number;
  date: string;
  time: string;
  name: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: unknown;
}

/**
 * Items arrive as real jsonb now, but rows written before portions existed
 * still only carry grams, so the defaults below stay.
 */
function parseItems(raw: unknown): MealItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    foodId: item.foodId,
    name: item.name,
    grams: item.grams,
    portionLabel: item.portionLabel ?? `${Math.round(item.grams)} ג׳`,
    quantity: item.quantity ?? 1,
  }));
}

function toMeal(row: MealRow): Meal {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    name: row.name,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    items: parseItems(row.items),
  };
}

export interface NewMeal {
  date: string;
  time: string;
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
}

function toMealPayload(meal: NewMeal) {
  return {
    date: meal.date,
    time: meal.time,
    name: meal.name,
    protein_g: meal.proteinG,
    carbs_g: meal.carbsG,
    fat_g: meal.fatG,
    items: meal.items,
  };
}

export async function addMeal(meal: NewMeal): Promise<number> {
  const row = unwrap(
    await supabase
      .from('meals')
      .insert(toMealPayload(meal))
      .select('id')
      .single<{ id: number }>()
  );
  return row.id;
}

export async function updateMeal(id: number, meal: NewMeal): Promise<void> {
  unwrap(await supabase.from('meals').update(toMealPayload(meal)).eq('id', id));
}

export async function deleteMeal(id: number): Promise<void> {
  unwrap(await supabase.from('meals').delete().eq('id', id));
}

export async function getMealsByDate(date: string): Promise<Meal[]> {
  const rows = unwrap(
    await supabase
      .from('meals')
      .select('*')
      .eq('date', date)
      .order('time', { ascending: true })
      .returns<MealRow[]>()
  );
  return rows.map(toMeal);
}

export async function getRecentMeals(limit = 30): Promise<Meal[]> {
  const rows = unwrap(
    await supabase
      .from('meals')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(limit)
      .returns<MealRow[]>()
  );
  return rows.map(toMeal);
}

interface SavedMealRow {
  id: number;
  name: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: unknown;
}

function toSavedMeal(row: SavedMealRow): SavedMeal {
  return {
    id: row.id,
    name: row.name,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    items: parseItems(row.items),
  };
}

export async function getSavedMeals(): Promise<SavedMeal[]> {
  const rows = unwrap(
    await supabase
      .from('saved_meals')
      .select('*')
      .order('name', { ascending: true })
      .returns<SavedMealRow[]>()
  );
  return rows.map(toSavedMeal);
}

export async function addSavedMeal(meal: Omit<SavedMeal, 'id'>): Promise<number> {
  const row = unwrap(
    await supabase
      .from('saved_meals')
      .insert({
        name: meal.name,
        protein_g: meal.proteinG,
        carbs_g: meal.carbsG,
        fat_g: meal.fatG,
        items: meal.items,
      })
      .select('id')
      .single<{ id: number }>()
  );
  return row.id;
}

export async function deleteSavedMeal(id: number): Promise<void> {
  unwrap(await supabase.from('saved_meals').delete().eq('id', id));
}
