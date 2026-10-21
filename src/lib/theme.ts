/** Physio360 brand palette (matches the web portal) and spacing scale. */
export const colors = {
  ink: '#142D36', // midnight: headers, primary text
  primary: '#2F7D66',
  primaryDark: '#24614F',
  primarySoft: '#DCEDE6',
  mint: '#7FD1AE',
  bg: '#F3F7F5',
  surface: '#FFFFFF',
  surface2: '#F7FAF8',
  border: '#DCE6E2',
  text: '#1D2B30',
  muted: '#5B6B70',
  subtle: '#8A979C',
  success: '#2E8B57',
  successSoft: '#DFF2E7',
  warning: '#B7791F',
  warningSoft: '#FDF0D5',
  danger: '#C2410C',
  dangerSoft: '#FBE3E1',
  info: '#2563EB',
  infoSoft: '#E3ECFA',
  violet: '#6D4BC2',
  violetSoft: '#EDE6FA',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

export const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: '#EEF2F1', fg: colors.muted },
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  violet: { bg: colors.violetSoft, fg: colors.violet },
};

export const shadow = {
  shadowColor: '#0F2A2E',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;
