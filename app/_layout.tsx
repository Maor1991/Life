import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/components/theme';
import { BackButton } from '../src/components/BackButton';
import { SplashScreen } from '../src/components/SplashScreen';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { LanguageProvider, useLanguage } from '../src/hooks/useLanguage';

const SPLASH_DURATION_MS = 4000;

/**
 * Keeps the signed-out user on the sign-in screen and pulls them off it once a
 * session exists. Data screens assume a session, since RLS returns nothing
 * without one.
 */
function useAuthGate(ready: boolean) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready || loading) return;
    const onSignIn = segments[0] === 'sign-in';
    if (!session && !onSignIn) {
      router.replace('/sign-in');
    } else if (session && onSignIn) {
      router.replace('/');
    }
  }, [ready, loading, session, segments, router]);
}

function RootNavigator() {
  const [splashDone, setSplashDone] = useState(false);
  const { loading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = splashDone && !loading;
  useAuthGate(ready);

  if (!ready) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerLeft: () => <BackButton />,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen
          name="settings/index"
          options={{
            headerShown: true,
            headerTitle: () => null,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton to="/" />,
          }}
        />
        <Stack.Screen
          name="my-week"
          options={{
            headerShown: true,
            headerTitle: () => null,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton to="/" />,
          }}
        />
        <Stack.Screen
          name="trends"
          options={{
            headerShown: true,
            headerTitle: () => null,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton to="/" />,
          }}
        />
        <Stack.Screen
          name="calendar"
          options={{
            headerShown: true,
            headerTitle: () => null,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton to="/" />,
          }}
        />
        <Stack.Screen
          name="day/[date]"
          options={{
            headerShown: true,
            headerTitle: () => null,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton to="/calendar" />,
          }}
        />
        <Stack.Screen
          name="workouts/log"
          options={{ headerShown: true, title: t('workouts.title'), headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="workouts/session/[id]"
          options={{ headerShown: true, title: t('header.sessionDetail'), headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="workouts/exercise/[name]"
          options={{ headerShown: true, title: t('header.exerciseProgress'), headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="settings/meal-library"
          options={{
            headerShown: true,
            headerTitle: () => null,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton to="/settings" />,
          }}
        />
        <Stack.Screen
          name="settings/workout-templates"
          options={{
            headerShown: true,
            headerTitle: () => null,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton to="/settings" />,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </LanguageProvider>
  );
}
