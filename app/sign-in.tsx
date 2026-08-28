import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useFonts, Oswald_600SemiBold, Oswald_300Light } from '@expo-google-fonts/oswald';
import { Button, Card, Field, Screen } from '../src/components/ui';
import { LanguageToggle } from '../src/components/LanguageToggle';
import { colors, spacing } from '../src/components/theme';
import { useAuth } from '../src/hooks/useAuth';
import { useLanguage } from '../src/hooks/useLanguage';

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const { t, isRTL } = useLanguage();
  const [fontsLoaded] = useFonts({ Oswald_600SemiBold, Oswald_300Light });
  const align = isRTL ? 'right' : 'left';
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signUp';

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(contentTranslateY, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError(t('signIn.fillBoth'));
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        // With email confirmation on, no session arrives until the link is clicked.
        setNotice(t('signIn.confirmationSent'));
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signIn.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen showLogo={false}>
      <View style={styles.header}>
        <View style={styles.languageToggleTopLeft}>
          <LanguageToggle />
        </View>
        <Image
          source={require('../assets/person-tree-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text
          style={[
            styles.title,
            { color: colors.text },
            fontsLoaded && { fontFamily: 'Oswald_600SemiBold' },
          ]}
        >
          C
          <Text style={fontsLoaded && { fontFamily: 'Oswald_300Light' }}>'</Text>
          e la vie
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted, textAlign: 'center' }]}>
          {t('tabs.workouts')} | {t('tabs.sleep')} | {t('tabs.nutrition')} | REPEAT
        </Text>
      </View>

      <Animated.View
        style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }], gap: spacing.md }}
      >
        <Card>
          <Field
            label={t('signIn.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />
          <Field
            label={t('signIn.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={isSignUp ? 'newPassword' : 'password'}
            placeholder="••••••••"
          />

          {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}
          {notice ? <Text style={[styles.notice, { textAlign: align }]}>{notice}</Text> : null}

          <View style={styles.actions}>
            <Button
              title={busy ? t('common.saving') : isSignUp ? t('signIn.signUp') : t('signIn.signIn')}
              onPress={submit}
              disabled={busy}
            />
            <Button
              title={isSignUp ? t('signIn.alreadyHaveAccount') : t('signIn.noAccountYet')}
              variant="secondary"
              onPress={() => {
                setMode(isSignUp ? 'signIn' : 'signUp');
                setError(null);
                setNotice(null);
              }}
            />
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  languageToggleTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  logo: {
    width: 80,
    height: 97,
  },
  title: {
    fontSize: 24,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 4,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  notice: {
    color: colors.success,
    fontSize: 13,
  },
});
