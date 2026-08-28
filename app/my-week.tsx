import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card, Screen, SectionTitle } from '../src/components/ui';
import { SlideMenu } from '../src/components/SlideMenu';
import { colors } from '../src/components/theme';
import { useLanguage } from '../src/hooks/useLanguage';
import { useChecklist } from '../src/hooks/useChecklist';
import { useNutritionTargets } from '../src/hooks/useNutritionTargets';
import { sessionSummaryLabel } from '../src/domain/workoutTypes';

export default function MyWeekScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const { weeklyWorkouts, refresh } = useChecklist();
  const { targets, refresh: refreshTargets } = useNutritionTargets();

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshTargets();
    }, [refresh, refreshTargets])
  );

  return (
    <SlideMenu
      items={[
        { label: t('home.title'), onPress: () => router.push('/') },
        { label: t('checklist.myWeek'), onPress: () => router.push('/my-week') },
        { label: t('trends.title'), onPress: () => router.push('/trends') },
        { label: t('settings.title'), onPress: () => router.push('/settings') },
      ]}
    >
      <Screen showLogo={false}>
      <SectionTitle>{t('checklist.myWeek')}</SectionTitle>

      <Card>
        {weeklyWorkouts.map((day) => (
          <View
            key={day.date}
            style={{
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: align }}>
              {t(`common.weekdayInitial.${day.weekday}`)} · {day.date.slice(5).replace('-', '/')}
            </Text>
            <Text
              style={{
                color: day.sessions.length > 0 ? colors.text : colors.muted,
                fontSize: 13,
                textAlign: align,
              }}
            >
              {day.sessions.length > 0
                ? day.sessions.map((s) => sessionSummaryLabel(s, t)).join(' • ')
                : t('checklist.noWorkouts')}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: align }}>
              {t('nutrition.protein')}: {Math.round(day.macros.proteinG)}/{Math.round(targets.proteinG)}
              {'   '}
              {t('nutrition.carbs')}: {Math.round(day.macros.carbsG)}/{Math.round(targets.carbsG)}
              {'   '}
              {t('nutrition.fat')}: {Math.round(day.macros.fatG)}/{Math.round(targets.fatG)}
            </Text>
          </View>
        ))}
      </Card>
      </Screen>
    </SlideMenu>
  );
}
