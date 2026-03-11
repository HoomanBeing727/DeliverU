import { useAuth } from '../context/AuthContext';

export type ThemeMode = 'light' | 'dark';

export const LIGHT_THEME = {
  colors: {
    // Core
    bg: '#F2F2F7',
    card: '#FFFFFF',
    text: '#1C1C1E',
    subtext: '#8E8E93',
    accent: '#003366',
    accentLight: '#E8EFF7',
    border: '#E5E5EA',

    // Semantic
    danger: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5AC8FA',
    muted: '#AEAEB2',

    // Extended palette
    purple: '#AF52DE',
    pink: '#FF2D55',
    teal: '#5AC8FA',
    indigo: '#5856D6',
    orange: '#FF9500',
    mint: '#00C7BE',

    // Status (order lifecycle)
    statusPending: '#FF9500',
    statusAccepted: '#007AFF',
    statusPickedUp: '#AF52DE',
    statusDelivered: '#34C759',
    statusCancelled: '#FF3B30',

    // Surfaces
    secondaryBg: '#E5E5EA',
    tertiaryBg: '#D1D1D6',
    groupedBg: '#F2F2F7',
    separator: '#C6C6C8',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    subhead: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.24 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
  },
};

export const DARK_THEME = {
  colors: {
    // Core
    bg: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    subtext: '#8E8E93',
    accent: '#0A84FF',
    accentLight: '#0A84FF1A',
    border: '#38383A',

    // Semantic
    danger: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A',
    info: '#64D2FF',
    muted: '#636366',

    // Extended palette
    purple: '#BF5AF2',
    pink: '#FF375F',
    teal: '#64D2FF',
    indigo: '#5E5CE6',
    orange: '#FF9F0A',
    mint: '#63E6E2',

    // Status (order lifecycle)
    statusPending: '#FF9F0A',
    statusAccepted: '#0A84FF',
    statusPickedUp: '#BF5AF2',
    statusDelivered: '#30D158',
    statusCancelled: '#FF453A',

    // Surfaces
    secondaryBg: '#2C2C2E',
    tertiaryBg: '#3A3A3C',
    groupedBg: '#000000',
    separator: '#48484A',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    subhead: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.24 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 1,
    },
  },
};

export type Theme = typeof LIGHT_THEME;

export function useTheme(): Theme {
  const { user } = useAuth();
  return (user?.dark_mode ? DARK_THEME : LIGHT_THEME) as Theme;
}
