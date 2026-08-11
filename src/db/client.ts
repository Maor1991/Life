import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Both values are inlined into the bundle at build time and are safe to ship:
// the publishable key only grants what the RLS policies in supabase/schema.sql
// allow, which is the signed-in user's own rows and nothing else.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in the values from your Supabase project settings.'
  );
}

const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // On web the default localStorage adapter is right; on native there is no
    // localStorage, so sessions go through AsyncStorage instead.
    ...(isWeb ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    // Only the web build ever comes back from a magic-link redirect carrying
    // the session in the URL fragment.
    detectSessionInUrl: isWeb,
  },
});

/** Throws the PostgrestError as a real Error so callers get a usable stack. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/**
 * Same as unwrap, but for `.rpc()` calls. Without generated database types
 * supabase-js cannot infer a function's row shape, so the caller names it.
 */
export function unwrapRows<T>(result: {
  data: unknown;
  error: { message: string } | null;
}): T[] {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T[];
}
