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
  const { loaded, currentUser } = useStore();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  const signedIn = currentUser !== null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Ohne Anmeldung ist nur der Anmeldebildschirm erreichbar. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="buchung" options={{ presentation: 'modal', title: 'Buchung' }} />
          <Stack.Screen name="fixposten" options={{ title: 'Fixkosten & Einkommen' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="anmelden" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
