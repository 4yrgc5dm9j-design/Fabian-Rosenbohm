import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { StoreProvider, useStore } from '@/lib/store';

export {
  // Fehler im Navigationsbaum abfangen.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Beim Neuladen auf `/buchung` bleibt so ein Zurück-Button erhalten.
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <StoreProvider>
      <RootLayoutNav />
    </StoreProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { loaded } = useStore();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="buchung" options={{ presentation: 'modal', title: 'Buchung' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
