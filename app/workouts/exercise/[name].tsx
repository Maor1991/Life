import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Card, Screen, SectionTitle } from '../../../src/components/ui';
import { colors } from '../../../src/components/theme';
import { getExerciseHistory, type ExerciseHistoryPoint } from '../../../src/db/queries/workouts';

export default function ExerciseProgress() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const exerciseName = decodeURIComponent(name ?? '');
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const h = await getExerciseHistory(exerciseName);
    setHistory(h);
    setLoading(false);
  }, [exerciseName]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const data = history.map((h) => ({
    value: h.maxWeightKg,
    label: h.date.slice(5),
    dataPointText: String(h.maxWeightKg),
  }));

  return (
    <Screen>
      <SectionTitle>{exerciseName}</SectionTitle>
      <Card>
        {data.length < 2 ? (
          <Text style={{ color: colors.muted, textAlign: 'right' }}>
            צריך לפחות שני אימונים עם התרגיל הזה כדי להציג גרף התקדמות
          </Text>
        ) : (
          <LineChart
            data={data}
            color={colors.primary}
            thickness={3}
            dataPointsColor={colors.primary}
            yAxisTextStyle={{ color: colors.muted }}
            xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            noOfSections={4}
            backgroundColor="transparent"
          />
        )}
      </Card>
    </Screen>
  );
}
