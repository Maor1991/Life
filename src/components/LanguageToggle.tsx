import React from 'react';
import { Pressable, Text } from 'react-native';
import { colors, shadows } from './theme';
import { useLanguage } from '../hooks/useLanguage';
import { GlobeIcon } from './GlobeIcon';

/** Compact single-tap chip that flips between Hebrew and English. */
export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const isHe = language === 'he';

  return (
    <Pressable
      onPress={() => setLanguage(isHe ? 'en' : 'he')}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'center',
          gap: 7,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: colors.card,
          borderWidth: 1.5,
          borderColor: colors.primary,
          ...shadows.card,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <GlobeIcon size={15} color={colors.primary} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: 0.5 }}>
        {isHe ? t('common.hebrewShort') : t('common.englishShort')}
      </Text>
    </Pressable>
  );
}
