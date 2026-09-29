import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCents, formatCentsShort, formatMonth, formatMonthShort } from '@/lib/budget';
import { useTheme } from '@/lib/theme';

export type MonthValue = { month: string; incomeCents: number; expenseCents: number };

type Props = {
  data: MonthValue[];
  selected: string;
  onSelect: (month: string) => void;
};

const HEIGHT = 150;

/** Einnahmen und Ausgaben pro Monat als gruppierte Balken. Tippen wählt den Monat. */
export function MonthBars({ data, selected, onSelect }: Props) {
  const theme = useTheme();
  const [focus, setFocus] = useState<string | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.incomeCents, d.expenseCents]));
  const shown = data.find((d) => d.month === (focus ?? selected));

  return (
    <View>
      <View style={styles.legend}>
        <LegendItem color={theme.chartIncome} label="Einnahmen" />
        <LegendItem color={theme.chartExpense} label="Ausgaben" />
      </View>

      <View style={[styles.plot, { borderColor: theme.border }]}>
        {data.map((d) => {
          const active = d.month === selected;
          return (
            <Pressable
              key={d.month}
              style={styles.group}
              onPress={() => onSelect(d.month)}
              onHoverIn={() => setFocus(d.month)}
              onHoverOut={() => setFocus(null)}
              accessibilityLabel={`${formatMonth(d.month)}: Einnahmen ${formatCents(d.incomeCents)}, Ausgaben ${formatCents(d.expenseCents)}`}>
              <View style={[styles.bars, active && { backgroundColor: theme.track }]}>
                <Bar value={d.incomeCents} max={max} color={theme.chartIncome} />
                <Bar value={d.expenseCents} max={max} color={theme.chartExpense} />
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {data.map((d) => (
          <Text
            key={d.month}
            style={[
              styles.axisLabel,
              { color: d.month === selected ? theme.text : theme.muted },
              d.month === selected && { fontWeight: '700' },
            ]}>
            {formatMonthShort(d.month)}
          </Text>
        ))}
      </View>

      {shown ? (
        <View style={[styles.readout, { backgroundColor: theme.track }]}>
          <Text style={[styles.readoutTitle, { color: theme.text }]}>{formatMonth(shown.month)}</Text>
          <Text style={{ color: theme.muted }}>
            Einnahmen {formatCentsShort(shown.incomeCents)} · Ausgaben{' '}
            {formatCentsShort(shown.expenseCents)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const h = value > 0 ? Math.max(2, (value / max) * (HEIGHT - 8)) : 0;
  return <View style={[styles.bar, { height: h, backgroundColor: color }]} />;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  plot: {
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  group: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    height: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingTop: 4,
  },
  bar: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', marginTop: 6 },
  axisLabel: { flex: 1, textAlign: 'center', fontSize: 11 },
  readout: { borderRadius: 10, padding: 10, marginTop: 12 },
  readoutTitle: { fontWeight: '700', marginBottom: 2 },
});
