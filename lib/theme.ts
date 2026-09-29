import { useColorScheme } from 'react-native';

const light = {
  background: '#F4F5F7',
  card: '#FFFFFF',
  text: '#16181D',
  muted: '#6B7280',
  border: '#E3E5E9',
  tint: '#2E6FD8',
  income: '#1F8A58',
  expense: '#C93C3C',
  track: '#ECEEF1',
};

const dark: typeof light = {
  background: '#0F1115',
  card: '#1A1D23',
  text: '#F2F3F5',
  muted: '#9AA1AC',
  border: '#2A2E36',
  tint: '#6EA0F5',
  income: '#4CC38A',
  expense: '#F07474',
  track: '#262A31',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
