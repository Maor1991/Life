import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, type Language } from '../i18n/translations';

const STORAGE_KEY = 'life.language';

interface LanguageValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** True for Hebrew — the app's original, fully right-to-left layout. */
  isRTL: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('he');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'he' || stored === 'en') setLanguageState(stored);
    });
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = translations[language][key] ?? translations.he[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          str = str.replace(`{${name}}`, String(value));
        }
      }
      return str;
    },
    [language]
  );

  const value = useMemo<LanguageValue>(
    () => ({ language, setLanguage, isRTL: language === 'he', t }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
