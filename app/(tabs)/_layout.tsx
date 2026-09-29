import { Link, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useTheme } from '@/lib/theme';

function AddButton() {
  const theme = useTheme();
  return (
    <Link href="/buchung" asChild>
      <Pressable accessibilityLabel="Neue Buchung" hitSlop={10} style={{ marginRight: 16 }}>
        {({ pressed }) => (
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            size={28}
            tintColor={theme.tint}
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
        )}
      </Pressable>
    </Link>
  );
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        headerRight: () => <AddButton />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Übersicht',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="buchungen"
        options={{
          title: 'Buchungen',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'list.bullet', android: 'list', web: 'list' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}
