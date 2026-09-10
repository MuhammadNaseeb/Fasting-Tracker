import { useColorScheme } from 'react-native';
import { useStore } from '@/store/useStore';

export type Palette = {
  dark: boolean;
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  sub: string;
  border: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  danger: string;
  ringTrack: string;
  ribbonTrack: string;
  ok: string;
  tabPill: string;
  tabActive: string;
  tabInactive: string;
  purple: string;
  mint: string;
  sky: string;
  peach: string;
  purpleSoft: string;
  mintSoft: string;
  skySoft: string;
  peachSoft: string;
};

const LIGHT: Palette = {
  dark: false,
  bg: '#E7E3F8',
  card: '#FFFFFF',
  cardAlt: '#F2F0FA',
  text: '#191627',
  sub: '#8B879D',
  border: '#EBE8F6',
  primary: '#191627',
  primarySoft: '#EFEDF9',
  onPrimary: '#FFFFFF',
  accent: '#D97F2E',
  danger: '#E5484D',
  ringTrack: '#EDEBF6',
  ribbonTrack: '#EDEBF6',
  ok: '#3FBF83',
  tabPill: '#191627',
  tabActive: '#FFFFFF',
  tabInactive: 'rgba(255,255,255,0.45)',
  purple: '#8B7CF6',
  mint: '#5BC98F',
  sky: '#4FC3EF',
  peach: '#F2B95C',
  purpleSoft: '#E6E1FB',
  mintSoft: '#D9F4E4',
  skySoft: '#DBF1FB',
  peachSoft: '#FCEBCF',
};

const DARK: Palette = {
  dark: true,
  bg: '#141122',
  card: '#1E1A30',
  cardAlt: '#282342',
  text: '#F4F2FB',
  sub: '#9C96B5',
  border: '#2C2745',
  primary: '#C9C0FA',
  primarySoft: 'rgba(139,124,246,0.16)',
  onPrimary: '#171331',
  accent: '#F2B95C',
  danger: '#FF6369',
  ringTrack: '#2C2745',
  ribbonTrack: '#2C2745',
  ok: '#5BD79A',
  tabPill: '#211D36',
  tabActive: '#FFFFFF',
  tabInactive: 'rgba(255,255,255,0.45)',
  purple: '#A78BFA',
  mint: '#6FDCA4',
  sky: '#6FD2F5',
  peach: '#F6C97A',
  purpleSoft: 'rgba(139,124,246,0.18)',
  mintSoft: 'rgba(111,220,164,0.16)',
  skySoft: 'rgba(111,210,245,0.16)',
  peachSoft: 'rgba(246,201,122,0.16)',
};

export function useTheme(): Palette {
  const mode = useStore((s) => s.settings.themeMode);
  const system = useColorScheme();
  const effective = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  return effective === 'light' ? LIGHT : DARK;
}
