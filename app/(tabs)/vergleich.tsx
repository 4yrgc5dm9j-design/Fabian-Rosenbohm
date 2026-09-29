import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MonthBars } from '@/components/MonthBars';
import { Card, CardTitle, Segmented } from '@/components/ui';
import { ViewFilter } from '@/components/ViewFilter';
import {
  compareCategories,
  entriesForMonth,
  formatCents,
  formatMonth,
  freeIncome,
  shiftMonth,
  summarize,
  toDateString,
  viewFor,
} from '@/lib/budget';
import { useStore } from '@/lib/store';
import { useTheme, type Theme } from '@/lib/theme';

type Range = '6' | '12';

export default function CompareScreen() {
  const { transactions, fixed, viewer, month, setMonth } = useStore();
  const theme = useTheme();
  const [range, setRange] = useState<Range>('6');
  const [other, setOther] = useState(() => shiftMonth(month, -1));

  const entriesOf = useMemo(
    () => (m: string) => viewFor(entriesForMonth(transactions, fixed, m), viewer),
    [transactions, fixed, viewer],
  );

  const series = useMemo(() => {
    const count = Number(range);
    return Array.from({ length: count }, (_, i) => shiftMonth(month, i - count + 1)).map((m) => {
      const s = summarize(entriesOf(m));
      return { month: m, incomeCents: s.incomeCents, expenseCents: s.expenseCents };
    });
  }, [entriesOf, month, range]);

  const a = entriesOf(month);
  const b = entriesOf(other);
  const rows = useMemo(() => compareCategories(a, b), [a, b]);
  const today = toDateString(new Date());
  const freeA = freeIncome(a, month, today);
  const freeB = freeIncome(b, other, today);

  const withData = series.filter((s) => s.expenseCents > 0);
  const avgExpense = withData.length
    ? Math.round(withData.reduce((sum, s) => sum + s.expenseCents, 0) / withData.length)
    : 0;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <ViewFilter />

      <Card>
        <CardTitle>Verlauf</CardTitle>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '6', label: '6 Monate' },
            { value: '12', label: '12 Monate' },
          ]}
        />
        <View style={{ height: 16 }} />
        <MonthBars data={series} selected={month} onSelect={setMonth} />
        {avgExpense > 0 ? (
          <Text style={{ color: theme.muted, marginTop: 10 }}>
            Durchschnittliche Ausgaben: {formatCents(avgExpense)} pro Monat
          </Text>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Zwei Monate vergleichen</CardTitle>
        <View style={styles.pickers}>
          <MonthPicker label="Monat A" value={month} onChange={setMonth} theme={theme} />
          <MonthPicker label="Monat B" value={other} onChange={setOther} theme={theme} />
        </View>

        <View style={[styles.headerRow, { borderColor: theme.border }]}>
          <Text style={[styles.cellName, styles.headerText, { color: theme.muted }]}> </Text>
          <Text style={[styles.cell, styles.headerText, { color: theme.muted }]}>A</Text>
          <Text style={[styles.cell, styles.headerText, { color: theme.muted }]}>B</Text>
          <Text style={[styles.cell, styles.headerText, { color: theme.muted }]}>A − B</Text>
        </View>
        <CompareRow label="Einnahmen" a={freeA.incomeCents} b={freeB.incomeCents} theme={theme} goodWhenUp strong />
        <CompareRow label="Fixkosten" a={freeA.fixedExpenseCents} b={freeB.fixedExpenseCents} theme={theme} strong />
        <CompareRow label="Variabel" a={freeA.variableExpenseCents} b={freeB.variableExpenseCents} theme={theme} strong />
        <CompareRow label="Rest" a={freeA.remainingCents} b={freeB.remainingCents} theme={theme} goodWhenUp strong />

        <Text style={[styles.subTitle, { color: theme.text }]}>Ausgaben nach Kategorie</Text>
        {rows.length === 0 ? (
          <Text style={{ color: theme.muted }}>Keine Ausgaben in diesen Monaten.</Text>
        ) : (
          rows.map((r) => (
            <CompareRow
              key={r.category}
              label={r.category}
              color={r.color}
              a={r.aCents}
              b={r.bCents}
              theme={theme}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function MonthPicker(props: { label: string; value: string; onChange: (m: string) => void; theme: Theme }) {
  const { theme } = props;
  return (
    <View style={[styles.picker, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{props.label}</Text>
      <View style={styles.pickerRow}>
        <Pressable hitSlop={10} onPress={() => props.onChange(shiftMonth(props.value, -1))}>
          <Text style={[styles.arrow, { color: theme.tint }]}>‹</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{formatMonth(props.value)}</Text>
        <Pressable hitSlop={10} onPress={() => props.onChange(shiftMonth(props.value, 1))}>
          <Text style={[styles.arrow, { color: theme.tint }]}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompareRow(props: {
  label: string;
  a: number;
  b: number;
  theme: Theme;
  color?: string;
  goodWhenUp?: boolean;
  strong?: boolean;
}) {
  const { theme } = props;
  const diff = props.a - props.b;
  const good = props.goodWhenUp ? diff > 0 : diff < 0;
  const diffColor = diff === 0 ? theme.muted : good ? theme.income : theme.expense;
  return (
    <View style={styles.row}>
      <View style={[styles.cellName, styles.nameRow]}>
        {props.color ? <View style={[styles.dot, { backgroundColor: props.color }]} /> : null}
        <Text style={{ color: theme.text, fontWeight: props.strong ? '600' : '400' }} numberOfLines={1}>
          {props.label}
        </Text>
      </View>
      <Text style={[styles.cell, { color: theme.text }]}>{formatCents(props.a)}</Text>
      <Text style={[styles.cell, { color: theme.muted }]}>{formatCents(props.b)}</Text>
      <Text style={[styles.cell, { color: diffColor, fontWeight: '600' }]}>
        {diff > 0 ? '+' : diff < 0 ? '−' : '±'}
        {formatCents(Math.abs(diff))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  pickers: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  picker: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { fontSize: 24, lineHeight: 28, paddingHorizontal: 4 },
  headerRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 6 },
  headerText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  cellName: { flex: 1.3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cell: { flex: 1, textAlign: 'right', fontSize: 12.5, fontVariant: ['tabular-nums'] },
  subTitle: { fontWeight: '700', marginTop: 18, marginBottom: 4 },
});
