import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors, shadows, spacing } from './theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * A small "i" badge that reveals an explanation bubble on tap, so reference
 * text (intensity tiers, quality scales, etc.) doesn't sit permanently on
 * screen. Dismisses on tapping outside the bubble.
 */
export function InfoTooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { isRTL } = useLanguage();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.3,
          borderColor: colors.accentText,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentText }}>i</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
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
              maxHeight: '70%',
              ...shadows.raised,
            }}
          >
            <View style={{ gap: 6 }}>{children}</View>
            <Pressable
              onPress={() => setOpen(false)}
              style={{
                backgroundColor: colors.cardAlt,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {isRTL ? 'סגור' : 'Close'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
