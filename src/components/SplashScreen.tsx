import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useFonts, Oswald_600SemiBold, Oswald_300Light } from '@expo-google-fonts/oswald';
import { colors } from './theme';
import { useLanguage } from '../hooks/useLanguage';

export function SplashScreen() {
  const { t } = useLanguage();
  const [fontsLoaded] = useFonts({ Oswald_600SemiBold, Oswald_300Light });
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(barWidth, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [logoOpacity, logoScale, barWidth, taglineOpacity]);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.logo,
          fontsLoaded && { fontFamily: 'Oswald_600SemiBold' },
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        C
        <Text style={fontsLoaded && { fontFamily: 'Oswald_300Light' }}>'</Text>
        e la vie
      </Animated.Text>
      <Animated.View
        style={[
          styles.bar,
          { width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        {t('tabs.workouts')} | {t('tabs.sleep')} | {t('tabs.nutrition')} | REPEAT
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 38,
    color: colors.text,
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  bar: {
    marginTop: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    maxWidth: 72,
  },
  tagline: {
    marginTop: 14,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
