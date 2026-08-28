export const colors = {
  /** Robinhood-style dark theme: near-black page, elevated dark cards, neon green accent. */
  background: '#000000',
  card: '#1C1C1E',
  cardAlt: '#26262A',
  border: '#333336',
  text: '#FFFFFF',
  muted: '#8E8E93',
  primary: '#00C805',
  /** Text/icons placed on top of `primary`. */
  onPrimary: '#000000',
  /**
   * Same green as `primary`, kept as its own token for the *text/link* role
   * (vs. `primary`'s fill role) — one color, two intentional jobs, rather
   * than two near-identical hex values that used to just look coincidental.
   */
  accentText: '#00C805',
  success: '#00C805',
  warning: '#FFD60A',
  danger: '#FF5000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

/**
 * The app's full type scale — every text size in the app should come from
 * here rather than a one-off number, so sizing stays on a defined rhythm.
 */
export const typography = {
  caption: 12,
  body: 14,
  label: 15,
  subhead: 16,
  title: 18,
  display: 24,
};

/** Elevation presets — the depth that separates cards from the page. */
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
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
  if (pct >= 100) return 'rgba(0,200,5,0.20)';
  if (pct >= 60) return 'rgba(0,200,5,0.12)';
  if (pct > 0) return 'rgba(255,80,0,0.16)';
  return 'transparent';
}
