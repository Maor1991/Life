import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, ChecklistRow, Field, PillSelect, Row, Screen, SectionTitle } from '../../src/components/ui';
import { colors, spacing } from '../../src/components/theme';
import { useLanguage } from '../../src/hooks/useLanguage';
import {
  addSavedMeal,
  deleteSavedMeal,
  getSavedMeals,
  updateSavedMeal,
} from '../../src/db/queries/nutrition';
import {
  caloriesFromMacros,
  getFoodById,
  macrosForGrams,
  searchFoods,
  setCustomFoods,
  sumMacros,
  type Food,
} from '../../src/domain/foods';
import { addCustomFood, getCustomFoods } from '../../src/db/queries/customFoods';
import type { MealItem, SavedMeal } from '../../src/types';

function itemMacros(item: MealItem) {
  const food = getFoodById(item.foodId);
  if (!food) return { proteinG: 0, carbsG: 0, fatG: 0 };
  return macrosForGrams(food, item.grams);
}

function totalsForItems(items: MealItem[]) {
  return sumMacros(items.map(itemMacros));
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
}

export default function MealLibraryScreen() {
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MealItem[]>([]);
  const [mealName, setMealName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [customFoodsVersion, setCustomFoodsVersion] = useState(0);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServing, setCustomServing] = useState('');

  const load = useCallback(async () => {
    const [saved, custom] = await Promise.all([getSavedMeals(), getCustomFoods()]);
    setCustomFoods(custom);
    setCustomFoodsVersion((v) => v + 1);
    setSavedMeals(saved);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function startEditing(meal: SavedMeal) {
    setEditingId(meal.id);
    setMealName(meal.name);
    setItems(meal.items);
    setQuery('');
  }

  // Prefills the draft from the ?editId= param exactly once — savedMeals
  // reloading after a save shouldn't re-clobber the draft back to editing.
  const autoLoadedEditId = useRef<string | null>(null);
  useEffect(() => {
    if (!editId || autoLoadedEditId.current === editId) return;
    const meal = savedMeals.find((s) => s.id === Number(editId));
    if (meal) {
      startEditing(meal);
      autoLoadedEditId.current = editId;
    }
  }, [editId, savedMeals]);

  const results = useMemo(() => searchFoods(query), [query, customFoodsVersion]);
  const draftTotals = totalsForItems(items);

  function addFood(food: Food) {
    const portion = food.portions[0];
    setItems((prev) => [
      ...prev,
      { foodId: food.id, name: food.name, portionLabel: portion.label, quantity: 1, grams: portion.grams },
    ]);
    setQuery('');
  }

  function adjustQuantity(index: number, delta: number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const food = getFoodById(item.foodId);
        const portion = food?.portions.find((p) => p.label === item.portionLabel);
        const quantity = Math.max(0.5, Math.round((item.quantity + delta) * 2) / 2);
        return { ...item, quantity, grams: (portion?.grams ?? item.grams / item.quantity) * quantity };
      })
    );
  }

  function changePortion(index: number, portionLabel: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const food = getFoodById(item.foodId);
        const portion = food?.portions.find((p) => p.label === portionLabel);
        if (!portion) return item;
        return { ...item, portionLabel, grams: portion.grams * item.quantity };
      })
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function openCustomForm() {
    setCustomName(query.trim());
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setCustomServing('');
    setShowCustomForm(true);
  }

  async function handleCreateCustomFood() {
    const name = customName.trim();
    const proteinG = parseFloat(customProtein) || 0;
    const carbsG = parseFloat(customCarbs) || 0;
    const fatG = parseFloat(customFat) || 0;
    const servingGrams = parseFloat(customServing);
    if (!name || (proteinG === 0 && carbsG === 0 && fatG === 0)) return;

    const newId = await addCustomFood({
      name,
      proteinG,
      carbsG,
      fatG,
      servingGrams: Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams : undefined,
    });

    const custom = await getCustomFoods();
    setCustomFoods(custom);
    setCustomFoodsVersion((v) => v + 1);

    const created = custom.find((c) => c.id === `custom_${newId}`);
    if (created) addFood(created);

    setShowCustomForm(false);
    setQuery('');
  }

  function resetDraft() {
    setItems([]);
    setMealName('');
    setQuery('');
    setEditingId(null);
  }

  const effectiveName = mealName.trim() || items.map((i) => i.name).join(' + ');

  async function handleSaveTemplate() {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        name: effectiveName,
        proteinG: draftTotals.proteinG,
        carbsG: draftTotals.carbsG,
        fatG: draftTotals.fatG,
        items,
      };
      if (editingId != null) {
        await updateSavedMeal(editingId, payload);
      } else {
        await addSavedMeal(payload);
      }
      resetDraft();
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen showLogo={false}>
      <SectionTitle>{t('mealLibrary.title')}</SectionTitle>
      <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
        {t('mealLibrary.subtitle')}
      </Text>

      <Card>
        <Field
          label={t('nutrition.searchFood')}
          placeholder={t('nutrition.searchFoodPlaceholder')}
          value={query}
          onChangeText={setQuery}
        />

        {results.length > 0 && (
          <View style={{ gap: spacing.xs }}>
            {results.map((food) => (
              <Pressable
                key={food.id}
                onPress={() => addFood(food)}
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: 8,
                  padding: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Row>
                  <Text style={{ color: colors.accentText, fontSize: 12 }}>+ {food.portions[0].label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.text }}>{food.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      {t('nutrition.per100g', {
                        protein: food.per100g.proteinG,
                        carbs: food.per100g.carbsG,
                        fat: food.per100g.fatG,
                      })}
                    </Text>
                  </View>
                </Row>
              </Pressable>
            ))}
          </View>
        )}

        {query.trim().length > 0 && results.length === 0 && !showCustomForm && (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
              {t('nutrition.noFoodFound')}
            </Text>
            <Button title={t('nutrition.addNewFood')} variant="secondary" onPress={openCustomForm} />
          </View>
        )}

        {!showCustomForm && query.trim().length === 0 && (
          <Pressable onPress={openCustomForm} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: colors.accentText, fontSize: 12 }}>{t('nutrition.addOwnFood')}</Text>
          </Pressable>
        )}

        {showCustomForm && (
          <View
            style={{
              backgroundColor: colors.cardAlt,
              borderRadius: 10,
              padding: spacing.sm,
              gap: spacing.xs,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700', textAlign: align }}>
              {t('nutrition.newFoodTitle')}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>
              {t('nutrition.newFoodSubtitle')}
            </Text>

            <Field label={t('nutrition.foodName')} value={customName} onChangeText={setCustomName} />
            <Row style={{ gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Field label={t('nutrition.proteinPer100')} keyboardType="numeric" value={customProtein} onChangeText={setCustomProtein} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('nutrition.carbsPer100')} keyboardType="numeric" value={customCarbs} onChangeText={setCustomCarbs} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('nutrition.fatPer100')} keyboardType="numeric" value={customFat} onChangeText={setCustomFat} />
              </View>
            </Row>
            <Field
              label={t('nutrition.servingGrams')}
              placeholder={t('nutrition.servingGramsPlaceholder')}
              keyboardType="numeric"
              value={customServing}
              onChangeText={setCustomServing}
            />

            <Button title={t('nutrition.saveAndAdd')} onPress={handleCreateCustomFood} />
            <Button title={t('common.cancel')} variant="secondary" onPress={() => setShowCustomForm(false)} />
          </View>
        )}

        {items.length > 0 && (
          <View style={{ gap: spacing.xs }}>
            {items.map((item, i) => {
              const m = itemMacros(item);
              return (
                <View
                  key={`${item.foodId}-${i}`}
                  style={{ backgroundColor: colors.cardAlt, borderRadius: 8, padding: spacing.sm, gap: 6 }}
                >
                  <Row>
                    <Pressable onPress={() => removeItem(i)}>
                      <Text style={{ color: colors.danger, fontSize: 12 }}>{t('common.remove')}</Text>
                    </Pressable>
                    <Text style={{ color: colors.text }}>{item.name}</Text>
                  </Row>

                  <PillSelect
                    options={(getFoodById(item.foodId)?.portions ?? []).map((p) => ({ label: p.label, value: p.label }))}
                    value={item.portionLabel}
                    onChange={(label) => changePortion(i, label)}
                  />

                  <Row>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                      <StepButton label="−" onPress={() => adjustQuantity(i, -0.5)} />
                      <Text style={{ color: colors.text, fontWeight: '700', minWidth: 28, textAlign: 'center' }}>
                        {formatQuantity(item.quantity)}
                      </Text>
                      <StepButton label="+" onPress={() => adjustQuantity(i, 0.5)} />
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {Math.round(item.grams)} {t('nutrition.gramsShort')}
                    </Text>
                  </Row>
                  <Text style={{ color: colors.muted, fontSize: 11, textAlign: align }}>
                    {t('nutrition.itemMacros', {
                      protein: Math.round(m.proteinG),
                      carbs: Math.round(m.carbsG),
                      fat: Math.round(m.fatG),
                      kcal: Math.round(caloriesFromMacros(m)),
                    })}
                  </Text>
                </View>
              );
            })}

            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 }}>
              <Row>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {Math.round(caloriesFromMacros(draftTotals))} {t('nutrition.kcalShort')}
                </Text>
                <Text style={{ color: colors.muted, textAlign: align }}>{t('nutrition.mealTotal')}</Text>
              </Row>
            </View>

            <Field
              label={t('nutrition.mealName')}
              placeholder={items.map((i) => i.name).join(' + ')}
              value={mealName}
              onChangeText={setMealName}
            />

            <Button
              title={saving ? t('common.saving') : editingId != null ? t('common.save') : t('mealLibrary.save')}
              onPress={handleSaveTemplate}
              disabled={saving}
            />
            {editingId != null && (
              <Button title={t('common.cancelEdit')} variant="secondary" onPress={resetDraft} />
            )}
          </View>
        )}
        {items.length === 0 && editingId != null && (
          <Button title={t('common.cancelEdit')} variant="secondary" onPress={resetDraft} />
        )}
      </Card>

      <Card>
        <SectionTitle>{t('nutrition.savedMeals')}</SectionTitle>
        {savedMeals.length === 0 && (
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>{t('mealLibrary.empty')}</Text>
        )}
        {savedMeals.map((s) => (
          <ChecklistRow
            key={s.id}
            checkbox={false}
            label={s.name}
            subLabel={t('checklist.mealMacros', {
              calories: Math.round(caloriesFromMacros(s)),
              fat: Math.round(s.fatG),
              protein: Math.round(s.proteinG),
              carbs: Math.round(s.carbsG),
            })}
            checked={false}
            align={align}
            onToggle={() => startEditing(s)}
            onOpenDetails={() => deleteSavedMeal(s.id).then(load)}
            detailsLabel={t('common.delete')}
            strikethrough={false}
          />
        ))}
      </Card>
    </Screen>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: colors.accentText, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
