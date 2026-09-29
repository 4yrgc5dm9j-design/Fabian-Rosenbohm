import { Link, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, type ColorValue } from 'react-native';

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

function icon(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => <SymbolView name={name} tintColor={color} size={26} />;
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
          tabBarIcon: icon({ ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' }),
        }}
      />
      <Tabs.Screen
        name="buchungen"
        options={{
          title: 'Buchungen',
          tabBarIcon: icon({ ios: 'list.bullet', android: 'list', web: 'list' }),
        }}
      />
      <Tabs.Screen
        name="vergleich"
        options={{
          title: 'Vergleich',
          tabBarIcon: icon({ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }),
        }}
      />
      <Tabs.Screen
        name="netto"
        options={{
          title: 'Brutto-Netto',
          headerRight: undefined,
          tabBarIcon: icon({ ios: 'eurosign.circle.fill', android: 'euro', web: 'euro' }),
        }}
      />
      <Tabs.Screen
        name="haushalt"
        options={{
          title: 'Haushalt',
          headerRight: undefined,
          tabBarIcon: icon({ ios: 'person.2.fill', android: 'group', web: 'group' }),
        }}
      />
    </Tabs>
  );
}
