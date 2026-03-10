import { useAuth } from '../context/AuthContext';

export type ThemeMode = 'light' | 'dark';

export const LIGHT_THEME = {
  colors: {
    bg: '#F5F5F5',
    card: '#FFFFFF',
    text: '#333333',
    subtext: '#666666',
    accent: '#003366',
    border: '#E0E0E0',
    danger: '#CC3333',
    success: '#2E7D32',
    warning: '#ED6C02',
    muted: '#999999'
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  typography: {
    title1: { fontSize: 28, fontWeight: '700' as const },
    title2: { fontSize: 20, fontWeight: '700' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    subhead: { fontSize: 15, fontWeight: '600' as const },
    caption: { fontSize: 12, fontWeight: '400' as const }
  },
  shadow: {
    card: { 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 1 }, 
      shadowOpacity: 0.08, 
      shadowRadius: 4, 
      elevation: 2 
    },
    floating: { 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.12, 
      shadowRadius: 12, 
      elevation: 6 
    }
  }
} as const;

export const DARK_THEME = {
  colors: {
    bg: '#1A1A2E',
    card: '#16213E',
    text: '#EEEEEE',
    subtext: '#AAAAAA',
    accent: '#0F3460',
    border: '#2A2A40',
    danger: '#CC3333',
    success: '#2E7D32',
    warning: '#ED6C02',
    muted: '#999999'
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  typography: {
    title1: { fontSize: 28, fontWeight: '700' as const },
    title2: { fontSize: 20, fontWeight: '700' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    subhead: { fontSize: 15, fontWeight: '600' as const },
    caption: { fontSize: 12, fontWeight: '400' as const }
  },
  shadow: {
    card: { 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 1 }, 
      shadowOpacity: 0.08, 
      shadowRadius: 4, 
      elevation: 2 
    },
    floating: { 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.12, 
      shadowRadius: 12, 
      elevation: 6 
    }
  }
} as const;

export type Theme = typeof LIGHT_THEME | typeof DARK_THEME;

export function useTheme(): Theme {
  const { user } = useAuth();
  return user?.dark_mode ? DARK_THEME : LIGHT_THEME;
}
