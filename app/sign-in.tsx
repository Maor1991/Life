import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Screen } from '../src/components/ui';
import { colors, spacing } from '../src/components/theme';
import { useAuth } from '../src/hooks/useAuth';

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signUp';

  async function submit() {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('צריך למלא מייל וסיסמה');
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        // With email confirmation on, no session arrives until the link is clicked.
        setNotice('נשלח אליך מייל אישור. אשר אותו ואז התחבר.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'משהו השתבש');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Life</Text>
        <Text style={styles.subtitle}>
          התחבר כדי שהנתונים שלך יסתנכרנו בין הטלפון למחשב
        </Text>
      </View>

      <Card>
        <Field
          label="מייל"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
        <Field
          label="סיסמה"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType={isSignUp ? 'newPassword' : 'password'}
          placeholder="••••••••"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <View style={styles.actions}>
          <Button
            title={busy ? 'רגע…' : isSignUp ? 'צור חשבון' : 'התחבר'}
            onPress={submit}
            disabled={busy}
          />
          <Button
            title={isSignUp ? 'כבר יש לי חשבון' : 'אין לי חשבון עדיין'}
            variant="secondary"
            onPress={() => {
              setMode(isSignUp ? 'signIn' : 'signUp');
              setError(null);
              setNotice(null);
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'right',
  },
  notice: {
    color: colors.success,
    fontSize: 13,
    textAlign: 'right',
  },
});
