import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import {
  formatCents,
  inMonth,
  summarize,
  totalsByCategory,
  type TransactionType,
} from '@/lib/budget';
import { useStore } from '@/lib/store';
import { useTheme, type Theme } from '@/lib/theme';

export default function OverviewScreen() {
  const { transactions, month } = useStore();
  const theme = useTheme();
  const [breakdown, setBreakdown] = useState<TransactionType>('expense');

  const monthly = useMemo(() => inMonth(transactions, month), [transactions, month]);
  const summary = useMemo(() => summarize(monthly), [monthly]);
  const totals = useMemo(() => totalsByCategory(monthly, breakdown), [monthly, breakdown]);

  const balanceColor = summary.balanceCents < 0 ? theme.expense : theme.income;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <MonthSwitcher />

      <View style={[styles.card, cardStyle(theme)]}>
        <Text style={[styles.caption, { color: theme.muted }]}>Saldo</Text>
        <Text style={[styles.balance, { color: balanceColor }]}>
          {formatCents(summary.balanceCents)}
        </Text>
        <View style={styles.split}>
          <Stat label="Einnahmen" cents={summary.incomeCents} color={theme.income} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Stat label="Ausgaben" cents={summary.expenseCents} color={theme.expense} theme={theme} />
        </View>
      </View>

      <View style={[styles.card, cardStyle(theme)]}>
        <View style={[styles.segment, { backgroundColor: theme.track }]}>
          {(['expense', 'income'] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setBreakdown(type)}
              style={[styles.segmentItem, breakdown === type && { backgroundColor: theme.card }]}>
              <Text
                style={[
                  styles.segmentText,
                  { color: breakdown === type ? theme.text : theme.muted },
                ]}>
                {type === 'expense' ? 'Ausgaben' : 'Einnahmen'}
              </Text>
            </Pressable>
          ))}
        </View>

        {totals.length === 0 ? (
          <Text style={[styles.empty, { color: theme.muted }]}>
            Keine {breakdown === 'expense' ? 'Ausgaben' : 'Einnahmen'} in diesem Monat.{'\n'}
            Tippe oben rechts auf ＋, um eine Buchung anzulegen.
          </Text>
        ) : (
          totals.map((t) => (
            <View key={t.category} style={styles.barRow}>
              <View style={styles.barLabel}>
                <Text style={[styles.barName, { color: theme.text }]}>{t.category}</Text>
                <Text style={[styles.barValue, { color: theme.muted }]}>
                  {formatCents(t.cents)} · {Math.round(t.share * 100)} %
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.track }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: t.color, width: `${Math.max(t.share * 100, 2)}%` },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Stat(props: { label: string; cents: number; color: string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.caption, { color: props.theme.muted }]}>{props.label}</Text>
      <Text style={[styles.statValue, { color: props.color }]}>{formatCents(props.cents)}</Text>
    </View>
  );
}

function cardStyle(theme: Theme) {
  return { backgroundColor: theme.card, borderColor: theme.border };
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  caption: { fontSize: 13, fontWeight: '500' },
  balance: { fontSize: 34, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  split: { flexDirection: 'row', marginTop: 16, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 16 },
  stat: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: 16 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', lineHeight: 20, paddingVertical: 12 },
  barRow: { marginBottom: 14 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barName: { fontSize: 15, fontWeight: '500' },
  barValue: { fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
