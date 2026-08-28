import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from './theme';
import { MenuIcon } from './MenuIcon';
import { useLanguage } from '../hooks/useLanguage';

const DRAWER_WIDTH = 200;

export interface SlideMenuItem {
  label: string;
  onPress: () => void;
}

/**
 * Wraps a screen with a hamburger icon fixed at the top-right corner (stays
 * put, doesn't slide) that opens a drawer panel behind the page — the whole
 * page slides left to reveal it, rather than a popup appearing on top.
 */
export function SlideMenu({ items, children }: { items: SlideMenuItem[]; children: React.ReactNode }) {
  const { isRTL } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menuOpen, menuAnim]);

  const contentTranslateX = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -DRAWER_WIDTH],
  });

  function select(onPress: () => void) {
    setMenuOpen(false);
    onPress();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: DRAWER_WIDTH,
          backgroundColor: colors.card,
          paddingTop: 70,
        }}
      >
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
            <Pressable
              onPress={() => select(item.onPress)}
              style={{ paddingVertical: 14, paddingHorizontal: spacing.md }}
            >
              <Text style={{ color: colors.text, fontSize: 15, textAlign: align }}>{item.label}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      <Animated.View style={{ flex: 1, transform: [{ translateX: contentTranslateX }] }}>
        {children}
        {menuOpen && (
          <Pressable
            onPress={() => setMenuOpen(false)}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          />
        )}
      </Animated.View>

      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, right: 0 }} pointerEvents="box-none">
        <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={10} style={{ padding: spacing.md }}>
          <MenuIcon size={22} color={colors.muted} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
