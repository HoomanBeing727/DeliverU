import { useAuth } from '../context/AuthContext';

export type ThemeMode = 'light' | 'dark';

export const LIGHT_THEME = {
  colors: {
    // Core (original tokens preserved for backward compat)
    bg: '#F5F5F7',
    card: '#FFFFFF',
    text: '#1A1A2E',
    subtext: '#6B7280',
    accent: '#003366',
    accentLight: '#E8EFF7',
    border: '#E5E5EA',

    // New semantic aliases
    neutralBg: '#F5F5F7',
    cardBg: '#FFFFFF',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    divider: '#E5E7EB',
    cardBorder: 'transparent',

    // HKUST Gold
    gold: '#C4A035',
    goldLight: '#C4A03520',

    // Tab bar
    tabBar: '#003366',
    tabBarInactive: '#8E99A4',
    tabBarActive: '#C4A035',

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
    groupedBg: '#F5F5F7',
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
      borderWidth: 0,
      borderColor: 'transparent',
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
      borderWidth: 0,
      borderColor: 'transparent',
    },
  },
};

export const DARK_THEME = {
  colors: {
    // Core (backward compat)
    bg: '#121218',
    card: '#1C1C24',
    text: '#FFFFFF',
    subtext: '#8E8E93',
    accent: '#4D9FD8',
    accentLight: '#4D9FD81A',
    border: '#38383A',

    // New semantic aliases
    neutralBg: '#121218',
    cardBg: '#1C1C24',
    textPrimary: '#F0F0F5',
    textSecondary: '#9CA3AF',
    divider: '#2A2A35',
    cardBorder: '#2A2A35',

    // HKUST Gold (brighter for dark mode)
    gold: '#F2D06B',
    goldLight: '#F2D06B20',

    // Tab bar
    tabBar: '#1C1C24',
    tabBarInactive: '#636366',
    tabBarActive: '#F2D06B',

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
    secondaryBg: '#1E1E28',
    tertiaryBg: '#2A2A35',
    groupedBg: '#121218',
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
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      borderWidth: 1,
      borderColor: '#2A2A35',
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 8,
    },
    subtle: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      borderWidth: 1,
      borderColor: '#2A2A35',
    },
  },
};

export type Theme = typeof LIGHT_THEME;

export function useTheme(): Theme {
  const { user } = useAuth();
  return (user?.dark_mode ? DARK_THEME : LIGHT_THEME) as Theme;
}
