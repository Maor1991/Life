import React from 'react';
import { Screen, SectionTitle } from '../src/components/ui';
import { ChartsSection } from '../src/components/ChartsSection';
import { useLanguage } from '../src/hooks/useLanguage';

export default function TrendsScreen() {
  const { t } = useLanguage();

  return (
    <Screen showLogo={false}>
      <SectionTitle>{t('trends.title')}</SectionTitle>
      <ChartsSection />
    </Screen>
  );
}
