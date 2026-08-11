import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, useRouter, usePathname } from 'expo-router';
import { colors, shadows, spacing } from '../../src/components/theme';

const TABS: { href: string; label: string; icon: string; match: (p: string) => boolean }[] = [
  { href: '/', label: 'בית', icon: '🏠', match: (p) => p === '/' },
  { href: '/workouts', label: 'אימונים', icon: '🏋️', match: (p) => p.startsWith('/workouts') },
  { href: '/sleep', label: 'שינה', icon: '😴', match: (p) => p.startsWith('/sleep') },
  { href: '/nutrition', label: 'תזונה', icon: '🍽️', match: (p) => p.startsWith('/nutrition') },
  { href: '/settings', label: 'הגדרות', icon: '⚙️', match: (p) => p.startsWith('/settings') },
];

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <SafeAreaView edges={['bottom']} style={styles.tabBarSafeArea}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Pressable
                key={tab.href}
                onPress={() => router.push(tab.href as any)}
                style={styles.tabButton}
              >
                <Text style={styles.icon}>{tab.icon}</Text>
                <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBarSafeArea: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.raised,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 11,
    color: colors.muted,
  },
  labelActive: {
    color: colors.accentText,
    fontWeight: '700',
  },
});
