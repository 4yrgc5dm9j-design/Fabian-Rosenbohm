import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TransactionRow } from '@/components/TransactionRow';
import { Button, Card, CardTitle } from '@/components/ui';
import { entriesForMonth, fixedActiveIn, formatCents, formatMonth, summarize, type FixedItem } from '@/lib/budget';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/** Übersicht aller monatlichen Fixposten (Einkommen und Fixkosten). */
export default function FixedScreen() {
  const { fixed, month } = useStore();
  const theme = useTheme();

  const active = useMemo(() => fixed.filter((f) => fixedActiveIn(f, month)), [fixed, month]);
  const inactive = useMemo(() => fixed.filter((f) => !fixedActiveIn(f, month)), [fixed, month]);
  const sum = summarize(entriesForMonth([], fixed, month));

  const open = (f: FixedItem) => router.push({ pathname: '/buchung', params: { fixedId: f.id } });
  const asEntry = (f: FixedItem) => ({ ...f, date: `${month}-01`, createdAt: 0, fixedId: f.id });

  const section = (title: string, items: FixedItem[]) =>
    items.length > 0 ? (
      <View>
        <Text style={[styles.sectionTitle, { color: theme.muted }]}>{title}</Text>
        {items.map((f) => (
          <TransactionRow key={f.id} entry={asEntry(f)} onPress={() => open(f)} />
        ))}
      </View>
    ) : null;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Card>
        <CardTitle>{formatMonth(month)}</CardTitle>
        <Line label="Festes Einkommen" value={formatCents(sum.incomeCents)} color={theme.income} />
        <Line label="Fixkosten" value={formatCents(sum.expenseCents)} color={theme.expense} />
        <Line label="Bleibt vor variablen Ausgaben" value={formatCents(sum.balanceCents)} color={theme.text} />
      </Card>

      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <Button label="+ Einkommen" color={theme.income} onPress={() => router.push({ pathname: '/buchung', params: { fixed: '1', type: 'income' } })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="+ Fixkosten" color={theme.expense} onPress={() => router.push({ pathname: '/buchung', params: { fixed: '1', type: 'expense' } })} />
        </View>
      </View>

      {fixed.length === 0 ? (
        <Text style={[styles.empty, { color: theme.muted }]}>
          Noch keine Fixposten. Lege z. B. dein Gehalt, die Miete, Strom, Handy und Versicherungen an. Sie zählen
          dann automatisch jeden Monat, und die App berechnet dein frei verfügbares Einkommen.
        </Text>
      ) : null}
      {section('Einkommen', active.filter((f) => f.type === 'income'))}
      {section('Fixkosten', active.filter((f) => f.type === 'expense'))}
      {section('Nicht aktiv in diesem Monat', inactive)}
    </ScrollView>
  );
}

function Line({ label, value, color }: { label: string; value: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={styles.line}>
      <Text style={{ color: theme.muted }}>{label}</Text>
      <Text style={{ color, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  buttons: { flexDirection: 'row', gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  empty: { textAlign: 'center', lineHeight: 20 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
