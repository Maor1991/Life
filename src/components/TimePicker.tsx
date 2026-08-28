import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, spacing } from './theme';
import { useLanguage } from '../hooks/useLanguage';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

/** Rounded to the current whole hour — minutes are not tracked. */
export function nowTime(): string {
  return `${String(new Date().getHours()).padStart(2, '0')}:00`;
}

/** Tap-only time selection — no keyboard entry. */
export function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
}) {
  const { t, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const hour = value.split(':')[0];

  function select(h: string) {
    onChange(`${h}:00`);
    setOpen(false);
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.muted, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
        <Pressable
          onPress={() => onChange(nowTime())}
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: colors.cardAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.accentText, fontSize: 13 }}>{t('common.now')}</Text>
        </Pressable>

        <Pressable
          onPress={() => setOpen(true)}
          style={{
            flex: 1,
            backgroundColor: colors.cardAlt,
            borderRadius: 10,
            paddingHorizontal: spacing.sm,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, textAlign: isRTL ? 'right' : 'left' }}>{value}</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
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
              maxHeight: '80%',
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
              {value}
            </Text>

            <ScrollView>
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  flexWrap: 'wrap',
                  gap: spacing.xs,
                  justifyContent: 'center',
                }}
              >
                {HOURS.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => select(h)}
                    style={{
                      width: 64,
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: h === hour ? colors.primary : colors.cardAlt,
                    }}
                  >
                    <Text
                      style={{
                        color: h === hour ? colors.onPrimary : colors.text,
                        fontWeight: h === hour ? '700' : '400',
                      }}
                    >
                      {h}:00
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setOpen(false)}
              style={{
                backgroundColor: colors.cardAlt,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
