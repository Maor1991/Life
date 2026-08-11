import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function SplashScreen() {
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
        style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        Life
      </Animated.Text>
      <Animated.View
        style={[
          styles.bar,
          { width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        אימונים · שינה · תזונה
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: '#17181C',
    letterSpacing: 1,
  },
  bar: {
    marginTop: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F2C037',
    maxWidth: 72,
  },
  tagline: {
    marginTop: 14,
    fontSize: 13,
    color: '#8A8D94',
    letterSpacing: 3,
  },
});
