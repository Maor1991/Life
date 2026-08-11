import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Button,
  Card,
  Field,
  PillSelect,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
} from '../../../src/components/ui';
import { DateNavigator } from '../../../src/components/DateNavigator';
import { TimePicker, nowTime } from '../../../src/components/TimePicker';
import { colors, spacing } from '../../../src/components/theme';
import {
  addMeal,
  addSavedMeal,
  deleteMeal,
  deleteSavedMeal,
  getMealsByDate,
  getSavedMeals,
  updateMeal,
} from '../../../src/db/queries/nutrition';
import { useProfile } from '../../../src/hooks/useProfile';
import { computeMacroTargets } from '../../../src/domain/macros';
import {
  caloriesFromMacros,
  getFoodById,
  macrosForGrams,
  searchFoods,
  setCustomFoods,
  sumMacros,
  type Food,
} from '../../../src/domain/foods';
import { addCustomFood, getCustomFoods } from '../../../src/db/queries/customFoods';
import { today } from '../../../src/domain/dates';
import type { Meal, MealItem, SavedMeal } from '../../../src/types';

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

function describeItem(item: MealItem): string {
  const measure = `${formatQuantity(item.quantity)} × ${item.portionLabel}`;
  return `${item.name} ${measure} (${Math.round(item.grams)} ג׳)`;
}

function describeItems(items: MealItem[]): string {
  return items.map(describeItem).join(' · ');
}

export default function NutritionScreen() {
  const { profile } = useProfile();
  const [date, setDate] = useState(today());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);

  const [time, setTime] = useState(nowTime());
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
    const [m, s, custom] = await Promise.all([
      getMealsByDate(date),
      getSavedMeals(),
      getCustomFoods(),
    ]);
    setCustomFoods(custom);
    setCustomFoodsVersion((v) => v + 1);
    setMeals(m);
    setSavedMeals(s);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const targets = useMemo(() => {
    if (!profile) return null;
    return computeMacroTargets(
      profile.heightCm,
      profile.weightKg,
      profile.age,
      profile.sex,
      profile.activityLevel
    );
  }, [profile]);

  const results = useMemo(() => searchFoods(query), [query, customFoodsVersion]);
  const draftTotals = totalsForItems(items);

  const dayTotals = meals.reduce(
    (acc, m) => ({
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { proteinG: 0, carbsG: 0, fatG: 0 }
  );

  function addFood(food: Food) {
    const portion = food.portions[0];
    setItems((prev) => [
      ...prev,
      {
        foodId: food.id,
        name: food.name,
        portionLabel: portion.label,
        quantity: 1,
        grams: portion.grams,
      },
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
        return {
          ...item,
          quantity,
          grams: (portion?.grams ?? item.grams / item.quantity) * quantity,
        };
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
    setTime(nowTime());
    setEditingId(null);
  }

  function startEditing(meal: Meal) {
    setEditingId(meal.id);
    setItems(meal.items);
    setMealName(meal.name);
    setTime(meal.time);
    setQuery('');
  }

  const effectiveName = mealName.trim() || items.map((i) => i.name).join(' + ');

  async function handleAddMeal() {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        date,
        time,
        name: effectiveName,
        proteinG: draftTotals.proteinG,
        carbsG: draftTotals.carbsG,
        fatG: draftTotals.fatG,
        items,
      };
      if (editingId != null) {
        await updateMeal(editingId, payload);
      } else {
        await addMeal(payload);
      }
      resetDraft();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsFavorite() {
    if (items.length === 0) return;
    await addSavedMeal({
      name: effectiveName,
      proteinG: draftTotals.proteinG,
      carbsG: draftTotals.carbsG,
      fatG: draftTotals.fatG,
      items,
    });
    await load();
  }

  async function addFromSaved(saved: SavedMeal) {
    setSaving(true);
    try {
      await addMeal({
        date,
        time: nowTime(),
        name: saved.name,
        proteinG: saved.proteinG,
        carbsG: saved.carbsG,
        fatG: saved.fatG,
        items: saved.items,
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SectionTitle>תזונה</SectionTitle>

      <DateNavigator date={date} onChange={setDate} />

      {targets && (
        <Card>
          <SectionTitle>יעד יומי</SectionTitle>
          <Row>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
              {Math.round(caloriesFromMacros(dayTotals))} / {targets.calories}
            </Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>קלוריות</Text>
          </Row>
          <MacroRow label="חלבון" actual={dayTotals.proteinG} target={targets.proteinG} />
          <MacroRow label="פחמימה" actual={dayTotals.carbsG} target={targets.carbsG} />
          <MacroRow label="שומן" actual={dayTotals.fatG} target={targets.fatG} />
        </Card>
      )}

      {savedMeals.length > 0 && (
        <Card>
          <SectionTitle>ארוחות שמורות</SectionTitle>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
            לחיצה מוסיפה את הארוחה ליום הנוכחי
          </Text>
          {savedMeals.map((s) => (
            <Row
              key={s.id}
              style={{
                paddingVertical: spacing.xs,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <Pressable onPress={() => deleteSavedMeal(s.id).then(load)}>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>מחק</Text>
                </Pressable>
                <Pressable
                  onPress={() => addFromSaved(s)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 999,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 12 }}>
                    הוסף
                  </Text>
                </Pressable>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={{ color: colors.text }}>{s.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {Math.round(caloriesFromMacros(s))} קק״ל · ח {Math.round(s.proteinG)} · פ{' '}
                  {Math.round(s.carbsG)} · ש {Math.round(s.fatG)}
                </Text>
              </View>
            </Row>
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle>{editingId != null ? 'עריכת ארוחה' : 'הוספת ארוחה'}</SectionTitle>
        <TimePicker label="שעה" value={time} onChange={setTime} />

        <Field
          label="מה אכלת? (חיפוש מאכל)"
          placeholder="למשל: חזה עוף, ביצים, אורז"
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
                  <Text style={{ color: colors.accentText, fontSize: 12 }}>
                    + {food.portions[0].label}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.text }}>{food.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      ל-100 ג׳: ח {food.per100g.proteinG} · פ {food.per100g.carbsG} · ש{' '}
                      {food.per100g.fatG}
                    </Text>
                  </View>
                </Row>
              </Pressable>
            ))}
          </View>
        )}

        {query.trim().length > 0 && results.length === 0 && !showCustomForm && (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>
              לא נמצא מאכל בשם הזה במאגר
            </Text>
            <Button title="הוסף מאכל חדש משלי" variant="secondary" onPress={openCustomForm} />
          </View>
        )}

        {!showCustomForm && query.trim().length === 0 && (
          <Pressable onPress={openCustomForm} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: colors.accentText, fontSize: 12 }}>+ הוספת מאכל משלי</Text>
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
            <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'right' }}>
              מאכל חדש משלי
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
              הזן את הערכים כפי שמופיעים על האריזה, ל-100 גרם
            </Text>

            <Field label="שם המאכל" value={customName} onChangeText={setCustomName} />
            <Row style={{ gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="חלבון ל-100 ג׳"
                  keyboardType="numeric"
                  value={customProtein}
                  onChangeText={setCustomProtein}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="פחמימה ל-100 ג׳"
                  keyboardType="numeric"
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="שומן ל-100 ג׳"
                  keyboardType="numeric"
                  value={customFat}
                  onChangeText={setCustomFat}
                />
              </View>
            </Row>
            <Field
              label="משקל מנה בגרמים (לא חובה)"
              placeholder="למשל 60 — יוסיף מידה של ״מנה״"
              keyboardType="numeric"
              value={customServing}
              onChangeText={setCustomServing}
            />

            <Button title="שמור והוסף לארוחה" onPress={handleCreateCustomFood} />
            <Button
              title="ביטול"
              variant="secondary"
              onPress={() => setShowCustomForm(false)}
            />
          </View>
        )}

        {items.length > 0 && (
          <View style={{ gap: spacing.xs }}>
            {items.map((item, i) => {
              const m = itemMacros(item);
              return (
                <View
                  key={`${item.foodId}-${i}`}
                  style={{
                    backgroundColor: colors.cardAlt,
                    borderRadius: 8,
                    padding: spacing.sm,
                    gap: 6,
                  }}
                >
                  <Row>
                    <Pressable onPress={() => removeItem(i)}>
                      <Text style={{ color: colors.danger, fontSize: 12 }}>הסר</Text>
                    </Pressable>
                    <Text style={{ color: colors.text }}>{item.name}</Text>
                  </Row>

                  <PillSelect
                    options={(getFoodById(item.foodId)?.portions ?? []).map((p) => ({
                      label: p.label,
                      value: p.label,
                    }))}
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
                      {Math.round(item.grams)} ג׳
                    </Text>
                  </Row>
                  <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'right' }}>
                    ח {Math.round(m.proteinG)} · פ {Math.round(m.carbsG)} · ש {Math.round(m.fatG)} ·{' '}
                    {Math.round(caloriesFromMacros(m))} קק״ל
                  </Text>
                </View>
              );
            })}

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: spacing.sm,
                gap: 4,
              }}
            >
              <Row>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {Math.round(caloriesFromMacros(draftTotals))} קק״ל
                </Text>
                <Text style={{ color: colors.muted, textAlign: 'right' }}>סה״כ בארוחה</Text>
              </Row>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
                חלבון {Math.round(draftTotals.proteinG)} · פחמימה {Math.round(draftTotals.carbsG)} ·
                שומן {Math.round(draftTotals.fatG)}
              </Text>
            </View>

            <Field
              label="שם הארוחה (לא חובה)"
              placeholder={items.map((i) => i.name).join(' + ')}
              value={mealName}
              onChangeText={setMealName}
            />

            <Button
              title={saving ? 'שומר...' : editingId != null ? 'עדכן ארוחה' : 'הוסף ארוחה'}
              onPress={handleAddMeal}
              disabled={saving}
            />
            <Button
              title="שמור כארוחה קבועה"
              variant="secondary"
              onPress={handleSaveAsFavorite}
            />
            {editingId != null && (
              <Button title="בטל עריכה" variant="secondary" onPress={resetDraft} />
            )}
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle>ארוחות היום</SectionTitle>
        {meals.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: 'right' }}>אין עדיין ארוחות ליום זה</Text>
        )}
        {meals.map((m) => (
          <Row
            key={m.id}
            style={{
              paddingVertical: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Pressable onPress={() => deleteMeal(m.id).then(load)}>
                <Text style={{ color: colors.danger, fontSize: 12 }}>הסר</Text>
              </Pressable>
              <Pressable onPress={() => startEditing(m)}>
                <Text style={{ color: colors.accentText, fontSize: 12 }}>ערוך</Text>
              </Pressable>
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <Text style={{ color: colors.text }}>
                {m.time} · {m.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {Math.round(caloriesFromMacros(m))} קק״ל · ח {Math.round(m.proteinG)} · פ{' '}
                {Math.round(m.carbsG)} · ש {Math.round(m.fatG)}
              </Text>
              {m.items.length > 0 && (
                <Text style={{ color: colors.muted, fontSize: 11 }}>{describeItems(m.items)}</Text>
              )}
            </View>
          </Row>
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

function MacroRow({ label, actual, target }: { label: string; actual: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const remaining = Math.max(0, target - actual);
  return (
    <View style={{ gap: spacing.xs }}>
      <Row>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {Math.round(actual)} / {target} ג׳ · נשאר {Math.round(remaining)}
        </Text>
        <Text style={{ color: colors.text, textAlign: 'right' }}>{label}</Text>
      </Row>
      <ProgressBar pct={pct} />
    </View>
  );
}
