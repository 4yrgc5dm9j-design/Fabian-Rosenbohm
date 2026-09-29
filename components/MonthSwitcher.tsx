import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMonth, shiftMonth } from '@/lib/budget';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export function MonthSwitcher() {
  const { month, setMonth } = useStore();
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        accessibilityLabel="Vorheriger Monat"
        hitSlop={12}
        onPress={() => setMonth(shiftMonth(month, -1))}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
        <Text style={[styles.arrowText, { color: theme.tint }]}>‹</Text>
      </Pressable>
      <Text style={[styles.label, { color: theme.text }]}>{formatMonth(month)}</Text>
      <Pressable
        accessibilityLabel="Nächster Monat"
        hitSlop={12}
        onPress={() => setMonth(shiftMonth(month, 1))}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
        <Text style={[styles.arrowText, { color: theme.tint }]}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  arrow: { paddingHorizontal: 14, paddingVertical: 2 },
  arrowText: { fontSize: 30, lineHeight: 34, fontWeight: '300' },
  label: { fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.4 },
});
