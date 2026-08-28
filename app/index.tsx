import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Button,
  Card,
  ChecklistEmptyState,
  ChecklistRow,
  CollapsibleHeader,
  Field,
  Row,
  Screen,
  SectionTitle,
} from '../src/components/ui';
import { CalendarIcon } from '../src/components/CalendarIcon';
import { GlobeIcon } from '../src/components/GlobeIcon';
import { SlideMenu } from '../src/components/SlideMenu';
import { DateNavigator } from '../src/components/DateNavigator';
import { WeekWorkoutTracker } from '../src/components/WeekWorkoutTracker';
import { ChartsSection } from '../src/components/ChartsSection';
import { MuscleBalanceCard } from '../src/components/MuscleBalanceCard';
import { colors, spacing, shadows } from '../src/components/theme';
import { useLanguage } from '../src/hooks/useLanguage';
import { useChecklist } from '../src/hooks/useChecklist';
import { useDayChecklist } from '../src/hooks/useDayChecklist';
import type { MealChecklistItem } from '../src/hooks/useChecklist';
import { useNutritionTargets } from '../src/hooks/useNutritionTargets';
import { muscleLabel, sessionSummaryLabel } from '../src/domain/workoutTypes';
import { caloriesFromMacros, macrosForGrams, searchFoods, setCustomFoods, type Food } from '../src/domain/foods';
import { getCustomFoods } from '../src/db/queries/customFoods';
import { today as todayFn } from '../src/domain/dates';
import type { WorkoutTemplate } from '../src/types';

/**
 * Which checklist section is most relevant right now, so a first-time-today
 * visit opens the useful card instead of three collapsed shells: mornings
 * and late evenings are about last night's/tonight's sleep, the afternoon
 * training window favors workouts, everything else defaults to meals.
 */
function defaultOpenSection(): 'meals' | 'workouts' | 'sleep' {
  const hour = new Date().getHours();
  if (hour < 11 || hour >= 21) return 'sleep';
  if (hour >= 14) return 'workouts';
  return 'meals';
}

export default function Home() {
  const router = useRouter();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const [selectedDate, setSelectedDate] = useState(todayFn());
  const isToday = selectedDate === todayFn();

  const { streak, refresh: refreshStreak } = useChecklist();
  const {
    mealItems,
    workoutItems,
    extraMeals,
    extraSessions,
    macroTotals,
    slept,
    sleepHours,
    setSleepHours,
    toggleMeal,
    editMealDay,
    addAdHocMeal,
    removeMeal,
    toggleWorkout,
    removeSession,
    toggleSleep,
    refresh: refreshDay,
  } = useDayChecklist(selectedDate);
  const { targets, hasStats, refresh: refreshTargets } = useNutritionTargets();

  const initialSection = useState(defaultOpenSection)[0];
  const [mealsOpen, setMealsOpen] = useState(initialSection === 'meals');
  const [workoutsOpen, setWorkoutsOpen] = useState(initialSection === 'workouts');
  const [sleepOpen, setSleepOpen] = useState(initialSection === 'sleep');
  const [editingMeal, setEditingMeal] = useState<MealChecklistItem | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [mealQuery, setMealQuery] = useState('');
  const [customFoodsVersion, setCustomFoodsVersion] = useState(0);
  const [newMealName, setNewMealName] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealCarbs, setNewMealCarbs] = useState('');
  const [newMealFat, setNewMealFat] = useState('');
  const [savingNewMeal, setSavingNewMeal] = useState(false);

  const mealResults = useMemo(() => searchFoods(mealQuery), [mealQuery, customFoodsVersion]);

  useFocusEffect(
    useCallback(() => {
      refreshStreak();
      refreshDay();
      refreshTargets();
      getCustomFoods().then((foods) => {
        setCustomFoods(foods);
        setCustomFoodsVersion((v) => v + 1);
      });
    }, [refreshStreak, refreshDay, refreshTargets])
  );

  // Celebratory haptic the moment today's checklist becomes fully checked.
  const totalItems = mealItems.length + workoutItems.length + 1;
  const allDone = isToday && totalItems > 1 && mealItems.every((m) => m.checked) && workoutItems.every((w) => w.checked) && slept;
  const wasAllDone = useRef(false);
  useEffect(() => {
    if (allDone && !wasAllDone.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAllDone.current = allDone;
  }, [allDone]);

  function openEditMeal(item: MealChecklistItem) {
    setEditingMeal(item);
    // Best-effort guess at the quantity already in effect that day, based
    // on the template's base macros; falls back to 1x if the template has
    // no protein to compare against.
    const base = item.template.proteinG;
    const guessed = base > 0 ? item.todayProteinG / base : 1;
    setEditQuantity(Math.max(0.5, Math.round(guessed * 2) / 2));
  }

  async function saveEditMeal() {
    if (!editingMeal) return;
    setSavingEdit(true);
    try {
      await editMealDay(editingMeal, {
        proteinG: editingMeal.template.proteinG * editQuantity,
        carbsG: editingMeal.template.carbsG * editQuantity,
        fatG: editingMeal.template.fatG * editQuantity,
      });
      setEditingMeal(null);
    } finally {
      setSavingEdit(false);
    }
  }

  function openAddMeal() {
    setMealQuery('');
    setNewMealName('');
    setNewMealProtein('');
    setNewMealCarbs('');
    setNewMealFat('');
    setAddMealOpen(true);
  }

  /** Search hit fills the macro fields from the food's default portion — still editable, just no longer a guess. */
  function pickMealFood(food: Food) {
    const portion = food.portions[0];
    const macros = macrosForGrams(food, portion.grams);
    setNewMealName(food.name);
    setNewMealProtein(String(Math.round(macros.proteinG)));
    setNewMealCarbs(String(Math.round(macros.carbsG)));
    setNewMealFat(String(Math.round(macros.fatG)));
    setMealQuery('');
  }

  async function saveNewMeal() {
    if (!newMealName.trim()) return;
    setSavingNewMeal(true);
    try {
      await addAdHocMeal({
        name: newMealName.trim(),
        proteinG: parseFloat(newMealProtein) || 0,
        carbsG: parseFloat(newMealCarbs) || 0,
        fatG: parseFloat(newMealFat) || 0,
      });
      setAddMealOpen(false);
    } finally {
      setSavingNewMeal(false);
    }
  }

  function workoutLabel(template: WorkoutTemplate): string {
    if (template.muscleGroups.length === 0) return template.name;
    const muscles = template.muscleGroups.map((m) => muscleLabel(m, t)).join(', ');
    return `${template.name} : ${muscles}`;
  }

  const macroRows = [
    { key: 'protein', label: t('nutrition.protein'), value: macroTotals.proteinG, total: targets.proteinG, color: colors.primary },
    { key: 'carbs', label: t('nutrition.carbs'), value: macroTotals.carbsG, total: targets.carbsG, color: colors.warning },
    { key: 'fat', label: t('nutrition.fat'), value: macroTotals.fatG, total: targets.fatG, color: colors.danger },
  ];
  const hasMacros = targets.calories > 0;

  return (
    <SlideMenu
      items={[
        { label: t('home.title'), onPress: () => router.push('/') },
        { label: t('checklist.myWeek'), onPress: () => router.push('/my-week') },
        { label: t('trends.title'), onPress: () => router.push('/trends') },
        { label: t('settings.title'), onPress: () => router.push('/settings') },
      ]}
    >
      <Screen
        showLogoText={false}
        cornerAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => router.push('/calendar')} hitSlop={10}>
              <CalendarIcon size={24} color={colors.muted} />
            </Pressable>
            <Pressable onPress={() => setLanguage(language === 'he' ? 'en' : 'he')} hitSlop={10}>
              <GlobeIcon size={22} color={colors.muted} />
            </Pressable>
          </View>
        }
      >
      <DateNavigator date={selectedDate} onChange={setSelectedDate} />

      {!hasStats && (
        <Pressable onPress={() => router.push('/settings?openCalorie=1')}>
          <Card style={{ borderWidth: 1, borderColor: colors.primary }}>
            <Row>
              <Text style={{ color: colors.accentText, fontSize: 20 }}>›</Text>
              <SectionTitle>{t('home.completeProfile.title')}</SectionTitle>
            </Row>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: align }}>
              {t('home.completeProfile.subtitle')}
            </Text>
          </Card>
        </Pressable>
      )}

      {streak > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.cardAlt,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ color: colors.warning, fontWeight: '700' }}>🔥 {streak}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{t('home.streakDays')}</Text>
          </View>
        </View>
      )}

      {hasMacros && (
        <Card>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '400', textAlign: align }}>
            {Math.round(caloriesFromMacros(macroTotals))}
            <Text style={{ color: colors.muted }}> / {Math.round(targets.calories)}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}> {t('nutrition.kcalShort')}</Text>
          </Text>

          {macroRows.map((m) => (
            <View key={m.key} style={{ gap: 6 }}>
              <Row>
                <Text
                  style={{
                    color: m.total > 0 && m.value >= m.total ? m.color : colors.text,
                    fontSize: 16,
                    fontWeight: '300',
                  }}
                >
                  {Math.round(m.value)}
                  <Text style={{ color: m.color, fontWeight: '400' }}> / {Math.round(m.total)}</Text>
                  <Text style={{ fontSize: 12, color: m.color }}> {t('nutrition.gramsShort')}</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.text, fontWeight: '400', textAlign: align }}>{m.label}</Text>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.color }} />
                </View>
              </Row>
              <View
                style={{
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: colors.cardAlt,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    width: `${m.total > 0 ? Math.min(100, (m.value / m.total) * 100) : 0}%`,
                    backgroundColor: m.color,
                  }}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <CollapsibleHeader
          title={t('checklist.meals')}
          open={mealsOpen}
          onToggle={() => setMealsOpen((v) => !v)}
        />
        {mealsOpen && (
          <>
            {mealItems.length === 0 ? (
              <ChecklistEmptyState align={align} messageKey="checklist.noMeals" icon="🍽️" />
            ) : (
              mealItems.map((item) => (
                <ChecklistRow
                  key={item.template.id}
                  label={item.template.name}
                  subLabel={t('checklist.mealMacros', {
                    calories: Math.round(
                      caloriesFromMacros({
                        proteinG: item.todayProteinG,
                        carbsG: item.todayCarbsG,
                        fatG: item.todayFatG,
                      })
                    ),
                    fat: Math.round(item.todayFatG),
                    protein: Math.round(item.todayProteinG),
                    carbs: Math.round(item.todayCarbsG),
                  })}
                  checked={item.checked}
                  align={align}
                  onToggle={() => toggleMeal(item)}
                  onOpenDetails={() => openEditMeal(item)}
                  detailsLabel={t('common.edit')}
                  strikethrough={false}
                />
              ))
            )}

            {extraMeals.length > 0 && (
              <>
                <Text
                  style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: align, marginTop: 6 }}
                >
                  {t('checklist.extraMeals')}
                </Text>
                {extraMeals.map((meal) => (
                  <ChecklistRow
                    key={meal.id}
                    checkbox={false}
                    label={meal.name}
                    subLabel={t('checklist.mealMacros', {
                      calories: Math.round(caloriesFromMacros(meal)),
                      fat: Math.round(meal.fatG),
                      protein: Math.round(meal.proteinG),
                      carbs: Math.round(meal.carbsG),
                    })}
                    checked={false}
                    align={align}
                    onToggle={() => {}}
                    onOpenDetails={() => removeMeal(meal.id)}
                    detailsLabel={t('common.delete')}
                    strikethrough={false}
                  />
                ))}
              </>
            )}

            <Pressable onPress={openAddMeal} style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '700', textAlign: align }}>
                + {t('checklist.addMeal')}
              </Text>
            </Pressable>
          </>
        )}
      </Card>

      <Card>
        <CollapsibleHeader
          title={t('checklist.workouts')}
          open={workoutsOpen}
          onToggle={() => setWorkoutsOpen((v) => !v)}
        />
        {workoutsOpen && (
          <>
            {workoutItems.length === 0 && extraSessions.length === 0 ? (
              <ChecklistEmptyState align={align} messageKey="checklist.noWorkouts" icon="🏋️" />
            ) : (
              workoutItems.map((item) => (
                <ChecklistRow
                  key={item.template.id}
                  label={workoutLabel(item.template)}
                  checked={item.checked}
                  align={align}
                  onToggle={() => toggleWorkout(item)}
                  onOpenDetails={
                    item.checked ? () => router.push(`/workouts/log?sessionId=${item.sessionId}`) : undefined
                  }
                  detailsLabel={t('checklist.openDetails')}
                  strikethrough={false}
                />
              ))
            )}

            {extraSessions.length > 0 && (
              <>
                <Text
                  style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: align, marginTop: 6 }}
                >
                  {t('checklist.extraWorkouts')}
                </Text>
                {extraSessions.map((session) => (
                  <ChecklistRow
                    key={session.id}
                    checkbox={false}
                    label={sessionSummaryLabel(session, t)}
                    checked={false}
                    align={align}
                    onToggle={() => {}}
                    onOpenDetails={() => removeSession(session.id)}
                    detailsLabel={t('common.delete')}
                    strikethrough={false}
                  />
                ))}
              </>
            )}
          </>
        )}
      </Card>

      <Card>
        <CollapsibleHeader
          title={t('checklist.sleepLabel')}
          count={undefined}
          open={sleepOpen}
          onToggle={() => setSleepOpen((v) => !v)}
        />
        {sleepOpen && (
          <>
            <ChecklistRow
              label={t('checklist.sleepHours', { hours: sleepHours })}
              checked={slept}
              align={align}
              onToggle={toggleSleep}
              strikethrough={false}
            />
            <Row style={{ justifyContent: 'center', gap: spacing.md }}>
              <Pressable
                onPress={() => setSleepHours(sleepHours - 1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.cardAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>−</Text>
              </Pressable>
              <Text style={{ color: colors.text, fontSize: 18, minWidth: 60, textAlign: 'center' }}>
                {sleepHours} {t('sleep.hoursShort')}
              </Text>
              <Pressable
                onPress={() => setSleepHours(sleepHours + 1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.cardAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>+</Text>
              </Pressable>
            </Row>
          </>
        )}
      </Card>

      <WeekWorkoutTracker onChange={refreshStreak} />

      <ChartsSection />

      <MuscleBalanceCard />

      <Modal
        visible={editingMeal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMeal(null)}
      >
        <Pressable
          onPress={() => setEditingMeal(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: spacing.sm,
              ...shadows.raised,
            }}
          >
            {editingMeal && (
              <>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, textAlign: align }}>
                  {editingMeal.template.name}
                </Text>
                <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '700', textAlign: align }}>
                  {t(isToday ? 'checklist.editTodayTitle' : 'checklist.editDayTitle')}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: align, lineHeight: 17 }}>
                  {t(isToday ? 'checklist.editTodayNote' : 'checklist.editDayNote')}
                </Text>

                <Row style={{ justifyContent: 'center', gap: spacing.md }}>
                  <Pressable
                    onPress={() => setEditQuantity((q) => Math.max(0.5, q - 0.5))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.cardAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>−</Text>
                  </Pressable>
                  <Text style={{ color: colors.text, fontSize: 18, minWidth: 50, textAlign: 'center' }}>
                    ×{Number.isInteger(editQuantity) ? editQuantity : editQuantity.toFixed(1)}
                  </Text>
                  <Pressable
                    onPress={() => setEditQuantity((q) => Math.min(5, q + 0.5))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.cardAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>+</Text>
                  </Pressable>
                </Row>

                <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
                  {t('checklist.mealMacros', {
                    calories: Math.round(caloriesFromMacros(editingMeal.template) * editQuantity),
                    fat: Math.round(editingMeal.template.fatG * editQuantity),
                    protein: Math.round(editingMeal.template.proteinG * editQuantity),
                    carbs: Math.round(editingMeal.template.carbsG * editQuantity),
                  })}
                </Text>

                <Button
                  title={savingEdit ? t('common.saving') : t('common.save')}
                  onPress={saveEditMeal}
                  disabled={savingEdit}
                />
                <Button title={t('common.cancel')} variant="secondary" onPress={() => setEditingMeal(null)} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={addMealOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMealOpen(false)}
      >
        <Pressable
          onPress={() => setAddMealOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: spacing.sm,
              ...shadows.raised,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, textAlign: align }}>
              {t('checklist.addMeal')}
            </Text>

            <Field
              label={t('nutrition.searchFood')}
              placeholder={t('nutrition.searchFoodPlaceholder')}
              value={mealQuery}
              onChangeText={setMealQuery}
            />
            {mealResults.length > 0 && (
              <View style={{ gap: spacing.xs }}>
                {mealResults.map((food) => (
                  <Pressable
                    key={food.id}
                    onPress={() => pickMealFood(food)}
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
                      <Text style={{ color: colors.text }}>{food.name}</Text>
                    </Row>
                  </Pressable>
                ))}
              </View>
            )}
            {mealQuery.trim().length > 0 && mealResults.length === 0 && (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>
                {t('nutrition.noFoodFound')}
              </Text>
            )}

            <Field label={t('nutrition.mealName')} value={newMealName} onChangeText={setNewMealName} />
            <Field
              label={t('nutrition.protein')}
              keyboardType="numeric"
              value={newMealProtein}
              onChangeText={setNewMealProtein}
            />
            <Field
              label={t('nutrition.carbs')}
              keyboardType="numeric"
              value={newMealCarbs}
              onChangeText={setNewMealCarbs}
            />
            <Field
              label={t('nutrition.fat')}
              keyboardType="numeric"
              value={newMealFat}
              onChangeText={setNewMealFat}
            />
            <Button
              title={savingNewMeal ? t('common.saving') : t('common.save')}
              onPress={saveNewMeal}
              disabled={savingNewMeal}
            />
            <Button title={t('common.cancel')} variant="secondary" onPress={() => setAddMealOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
      </Screen>
    </SlideMenu>
  );
}
