export const colors = {
  /** Soft off-white page behind white cards, so cards read as raised. */
  background: '#F5F5F2',
  card: '#FFFFFF',
  cardAlt: '#F4F4F0',
  border: '#E7E7E1',
  text: '#17181C',
  muted: '#8A8D94',
  primary: '#F2C037',
  /** Text/icons placed on top of `primary`. */
  onPrimary: '#17181C',
  /** Darkened accent for text and icons on light backgrounds. */
  accentText: '#A87700',
  success: '#1FA971',
  warning: '#E08A17',
  danger: '#DC4A4A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

/** Elevation presets — the depth that separates cards from the page. */
export const shadows = {
  card: {
    shadowColor: '#1B1C1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#1B1C1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
};

/** For fills and bars, where the bright accent reads well. */
export function scoreColor(pct: number): string {
  if (pct >= 100) return colors.success;
  if (pct >= 60) return colors.primary;
  if (pct > 0) return colors.danger;
  return colors.border;
}

/** For text, where the bright accent would be too low-contrast on white. */
export function scoreTextColor(pct: number): string {
  if (pct >= 100) return colors.success;
  if (pct >= 60) return colors.accentText;
  if (pct > 0) return colors.danger;
  return colors.muted;
}

/** Translucent version of the score colour, for calendar day fills. */
export function scoreTint(pct: number): string {
  if (pct >= 100) return 'rgba(31,169,113,0.16)';
  if (pct >= 60) return 'rgba(242,192,55,0.28)';
  if (pct > 0) return 'rgba(220,74,74,0.14)';
  return 'transparent';
}
