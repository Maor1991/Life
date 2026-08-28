import React, { useCallback, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, ChecklistEmptyState, ChecklistRow, Field, Row, Screen, SectionTitle } from '../../src/components/ui';
import { colors, spacing, shadows } from '../../src/components/theme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useDayChecklist } from '../../src/hooks/useDayChecklist';
import type { MealChecklistItem } from '../../src/hooks/useChecklist';
import { parseDate, today as todayFn } from '../../src/domain/dates';
import { muscleLabel, sessionSummaryLabel } from '../../src/domain/workoutTypes';
import { caloriesFromMacros } from '../../src/domain/foods';
import type { WorkoutTemplate } from '../../src/types';

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const {
    mealItems,
    workoutItems,
    extraMeals,
    extraSessions,
    slept,
    sleepHours,
    toggleMeal,
    editMealDay,
    addAdHocMeal,
    removeMeal,
    toggleWorkout,
    removeSession,
    toggleSleep,
    refresh,
  } = useDayChecklist(date ?? todayFn());
  const [editingMeal, setEditingMeal] = useState<MealChecklistItem | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealCarbs, setNewMealCarbs] = useState('');
  const [newMealFat, setNewMealFat] = useState('');
  const [savingNewMeal, setSavingNewMeal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function openEditMeal(item: MealChecklistItem) {
    setEditingMeal(item);
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
    setNewMealName('');
    setNewMealProtein('');
    setNewMealCarbs('');
    setNewMealFat('');
    setAddMealOpen(true);
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

  const d = parseDate(date ?? todayFn());
  const dateLabel = `${t(`common.weekday.${d.getDay()}`)}, ${d.getDate()} ${t(`common.month.${d.getMonth()}`)}`;

  return (
    <Screen showLogo={false}>
      <SectionTitle>{dateLabel}</SectionTitle>

      <Card>
        <SectionTitle>{t('checklist.meals')}</SectionTitle>
        {mealItems.length === 0 ? (
          <ChecklistEmptyState align={align} messageKey="checklist.noMeals" />
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
      </Card>

      <Card>
        <SectionTitle>{t('checklist.workouts')}</SectionTitle>
        {workoutItems.length === 0 && extraSessions.length === 0 ? (
          <ChecklistEmptyState align={align} messageKey="checklist.noWorkouts" />
        ) : (
          workoutItems.map((item) => (
            <ChecklistRow
              key={item.template.id}
              label={workoutLabel(item.template)}
              checked={item.checked}
              align={align}
              onToggle={() => toggleWorkout(item)}
              strikethrough={false}
            />
          ))
        )}

        {extraSessions.length > 0 && (
          <>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: align, marginTop: 6 }}>
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
      </Card>

      <Card>
        <SectionTitle>{t('checklist.sleepLabel')}</SectionTitle>
        <ChecklistRow
          label={t('checklist.sleepHours', { hours: sleepHours })}
          checked={slept}
          align={align}
          onToggle={toggleSleep}
          strikethrough={false}
        />
      </Card>

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
                  {t('checklist.editDayTitle')}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: align, lineHeight: 17 }}>
                  {t('checklist.editDayNote')}
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
  );
}
