import React from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from './theme';

/**
 * Header back button pointing right, matching the app's RTL reading direction.
 * `to` names an explicit destination for screens pushed on top of the (tabs)
 * group, which is a plain `Slot` with no navigator of its own — `router.back()`
 * there doesn't reliably land back on the tab it was opened from, so those
 * screens pass their known origin instead of relying on history.
 */
export function BackButton({ to }: { to?: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (to ? router.replace(to as any) : router.back())}
      hitSlop={16}
      style={{
        paddingHorizontal: 16,
        minWidth: 56,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Text style={{ color: colors.text, fontSize: 34, lineHeight: 34, fontWeight: '400' }}>›</Text>
    </Pressable>
  );
}
