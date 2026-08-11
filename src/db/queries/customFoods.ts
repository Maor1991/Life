import { supabase, unwrap } from '../client';
import { buildCustomFood, type Food } from '../../domain/foods';

interface CustomFoodRow {
  id: number;
  name: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_grams: number | null;
}

export const CUSTOM_FOOD_PREFIX = 'custom_';

function toFood(row: CustomFoodRow): Food {
  return buildCustomFood(
    `${CUSTOM_FOOD_PREFIX}${row.id}`,
    row.name,
    { proteinG: row.protein_g, carbsG: row.carbs_g, fatG: row.fat_g },
    row.serving_grams ?? undefined
  );
}

export interface NewCustomFood {
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingGrams?: number;
}

export async function getCustomFoods(): Promise<Food[]> {
  const rows = unwrap(
    await supabase
      .from('custom_foods')
      .select('*')
      .order('name', { ascending: true })
      .returns<CustomFoodRow[]>()
  );
  return rows.map(toFood);
}

export async function addCustomFood(food: NewCustomFood): Promise<number> {
  const row = unwrap(
    await supabase
      .from('custom_foods')
      .insert({
        name: food.name,
        protein_g: food.proteinG,
        carbs_g: food.carbsG,
        fat_g: food.fatG,
        serving_grams: food.servingGrams ?? null,
      })
      .select('id')
      .single<{ id: number }>()
  );
  return row.id;
}

export async function deleteCustomFood(id: string): Promise<void> {
  const numericId = Number(id.replace(CUSTOM_FOOD_PREFIX, ''));
  unwrap(await supabase.from('custom_foods').delete().eq('id', numericId));
}
