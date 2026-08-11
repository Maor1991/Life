import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/components/theme';
import { SplashScreen } from '../src/components/SplashScreen';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';

const SPLASH_DURATION_MS = 1400;

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

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = splashDone && !loading;
  useAuthGate(ready);

  if (!ready) {
    return (
      <>
        <StatusBar style="dark" />
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
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="workouts/session/[id]"
          options={{ headerShown: true, title: 'פרטי אימון', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="workouts/exercise/[name]"
          options={{ headerShown: true, title: 'התקדמות בתרגיל', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
