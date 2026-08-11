import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
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
import { colors, spacing } from '../../../src/components/theme';
import {
  addSleepSession,
  deleteSleepSession,
  getSleepDaySummaries,
  getSleepSessionsByDate,
  updateSleepSession,
} from '../../../src/db/queries/sleep';
import {
  SLEEP_KIND_OPTIONS,
  SLEEP_QUALITY_TIERS,
  formatHours,
  sleepKindLabel,
} from '../../../src/domain/sleepQuality';
import { useProfile } from '../../../src/hooks/useProfile';
import { today } from '../../../src/domain/dates';
import type { SleepDaySummary, SleepKind, SleepSession } from '../../../src/types';

const QUALITY_OPTIONS = SLEEP_QUALITY_TIERS.map((t) => ({ label: t.label, value: t.value }));

export default function SleepScreen() {
  const { profile } = useProfile();
  const [date, setDate] = useState(today());
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [summaries, setSummaries] = useState<SleepDaySummary[]>([]);

  const [kind, setKind] = useState<SleepKind>('night');
  const [hours, setHours] = useState('8');
  const [quality, setQuality] = useState(4);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [s, sum] = await Promise.all([getSleepSessionsByDate(date), getSleepDaySummaries(30)]);
    setSessions(s);
    setSummaries(sum);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const dayHours = sessions.reduce((sum, s) => sum + s.hours, 0);
  const target = profile?.sleepTargetHours ?? 8;
  const dayQuality =
    dayHours > 0
      ? sessions.reduce((sum, s) => sum + s.quality * s.hours, 0) / dayHours
      : 0;

  function resetForm() {
    setKind('night');
    setHours('8');
    setQuality(4);
    setEditingId(null);
  }

  function startEditing(session: SleepSession) {
    setEditingId(session.id);
    setKind(session.kind);
    setHours(String(session.hours));
    setQuality(session.quality);
  }

  function adjustHours(delta: number) {
    const current = parseFloat(hours) || 0;
    const next = Math.max(0.25, Math.round((current + delta) * 4) / 4);
    setHours(String(next));
  }

  async function handleSave() {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    setSaving(true);
    try {
      const payload = { date, kind, hours: h, quality };
      if (editingId != null) {
        await updateSleepSession(editingId, payload);
      } else {
        await addSleepSession(payload);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  const chartData = [...summaries]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((s) => ({ value: s.hours, label: s.date.slice(5) }));

  const selectedTier = SLEEP_QUALITY_TIERS.find((t) => t.value === quality);
  const pct = target > 0 ? Math.min(100, (dayHours / target) * 100) : 0;

  return (
    <Screen>
      <SectionTitle>שינה</SectionTitle>

      <DateNavigator date={date} onChange={setDate} />

      <Card>
        <SectionTitle>סיכום היום</SectionTitle>
        <Row>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
            {formatHours(dayHours)} / {formatHours(target)}
          </Text>
          <Text style={{ color: colors.muted, textAlign: 'right' }}>סה״כ שינה</Text>
        </Row>
        <ProgressBar pct={pct} />
        {sessions.length > 0 && (
          <Row>
            <Text style={{ color: colors.text }}>{dayQuality.toFixed(1)} / 5</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>
              איכות ממוצעת ({sessions.length} {sessions.length === 1 ? 'שינה' : 'שינות'})
            </Text>
          </Row>
        )}
      </Card>

      <Card>
        <SectionTitle>{editingId != null ? 'עריכת שינה' : 'הוספת שינה'}</SectionTitle>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
          אפשר להוסיף כמה שינות לאותו יום — שינת לילה ותנומות בנפרד
        </Text>

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>סוג השינה</Text>
        <PillSelect options={SLEEP_KIND_OPTIONS} value={kind} onChange={setKind} />

        <Field label="משך (שעות)" keyboardType="numeric" value={hours} onChangeText={setHours} />
        <Row>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <StepButton label="−15 דק׳" onPress={() => adjustHours(-0.25)} />
            <StepButton label="−1 שע׳" onPress={() => adjustHours(-1)} />
            <StepButton label="+1 שע׳" onPress={() => adjustHours(1)} />
            <StepButton label="+15 דק׳" onPress={() => adjustHours(0.25)} />
          </View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {formatHours(parseFloat(hours) || 0)}
          </Text>
        </Row>

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right' }}>איכות</Text>
        <PillSelect options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />

        <View
          style={{
            gap: 6,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
            מה כל דירוג אומר?
          </Text>
          {SLEEP_QUALITY_TIERS.map((tier) => {
            const isCurrent = tier.value === quality;
            return (
              <Text
                key={tier.value}
                style={{ textAlign: 'right', fontSize: 12, lineHeight: 18 }}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    color: colors.text,
                    backgroundColor: isCurrent ? 'rgba(242,192,55,0.35)' : 'transparent',
                  }}
                >
                  {tier.value} — {tier.title}:{' '}
                </Text>
                <Text style={{ color: colors.muted }}>{tier.description}</Text>
              </Text>
            );
          })}
        </View>

        <Button
          title={saving ? 'שומר...' : editingId != null ? 'עדכן שינה' : 'הוסף שינה'}
          onPress={handleSave}
          disabled={saving}
        />
        {editingId != null && (
          <Button title="בטל עריכה" variant="secondary" onPress={resetForm} />
        )}
      </Card>

      <Card>
        <SectionTitle>השינות של היום</SectionTitle>
        {sessions.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: 'right' }}>
            אין עדיין רישומי שינה ליום זה
          </Text>
        )}
        {sessions.map((s) => {
          const tier = SLEEP_QUALITY_TIERS.find((t) => t.value === s.quality);
          return (
            <Row
              key={s.id}
              style={{
                paddingVertical: spacing.xs,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <Pressable onPress={() => deleteSleepSession(s.id).then(load)}>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>הסר</Text>
                </Pressable>
                <Pressable onPress={() => startEditing(s)}>
                  <Text style={{ color: colors.accentText, fontSize: 12 }}>ערוך</Text>
                </Pressable>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={{ color: colors.text }}>
                  {sleepKindLabel(s.kind)} · {formatHours(s.hours)}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  איכות {s.quality} — {tier?.title}
                </Text>
              </View>
            </Row>
          );
        })}
      </Card>

      {chartData.length >= 2 && (
        <Card>
          <SectionTitle>מגמת שעות שינה</SectionTitle>
          <LineChart
            data={chartData}
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
        </Card>
      )}
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
