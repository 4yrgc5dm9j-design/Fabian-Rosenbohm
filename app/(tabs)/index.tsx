import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import { QuickAdd } from '@/components/QuickAdd';
import { Card, CardTitle, Segmented } from '@/components/ui';
import { ViewFilter } from '@/components/ViewFilter';
import {
  daysInMonth,
  formatCents,
  freeIncome,
  shiftMonth,
  toDateString,
  totalsByCategory,
  type TransactionType,
} from '@/lib/budget';
import { buildInsights, type InsightTone } from '@/lib/insights';
import { useStore } from '@/lib/store';
import { useTheme, type Theme } from '@/lib/theme';
import { useMonthEntries } from '@/lib/useEntries';

export default function OverviewScreen() {
  const { month, viewer, settings } = useStore();
  const theme = useTheme();
  const [breakdown, setBreakdown] = useState<TransactionType>('expense');

  const entries = useMonthEntries(month);
  const previous = useMonthEntries(shiftMonth(month, -1));
  const today = toDateString(new Date());
  // Das Sparziel gilt für den ganzen Haushalt, nicht für einzelne Personen.
  const free = useMemo(
    () => freeIncome(entries, month, today, viewer ? 0 : settings.savingsGoalCents),
    [entries, month, today, viewer, settings.savingsGoalCents],
  );
  const totals = useMemo(() => totalsByCategory(entries, breakdown), [entries, breakdown]);
  const insights = useMemo(
    () =>
      buildInsights({
        month,
        previousMonth: shiftMonth(month, -1),
        current: entries,
        previous,
        free,
        dayOfMonth: free.daysLeft !== null ? Number(today.slice(8, 10)) : null,
        daysInMonth: daysInMonth(month),
      }),
    [month, entries, previous, free, today],
  );

  const spentShare = free.freeCents > 0 ? free.variableExpenseCents / free.freeCents : 1;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ViewFilter />
      <MonthSwitcher />

      <Card>
        <Text style={[styles.caption, { color: theme.muted }]}>Noch frei verfügbar</Text>
        <Text
          style={[
            styles.hero,
            { color: free.remainingCents < 0 ? theme.expense : theme.income },
          ]}>
          {formatCents(free.remainingCents)}
        </Text>
        {free.perDayCents !== null && free.daysLeft !== null ? (
          <Text style={{ color: theme.muted, marginTop: 2 }}>
            {formatCents(free.perDayCents)} pro Tag für die restlichen {free.daysLeft}{' '}
            {free.daysLeft === 1 ? 'Tag' : 'Tage'}
          </Text>
        ) : null}

        <View style={[styles.track, { backgroundColor: theme.track }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(Math.max(spentShare, 0), 1) * 100}%`,
                backgroundColor: spentShare > 0.9 ? theme.expense : theme.tint,
              },
            ]}
          />
        </View>

        <Line label="Einnahmen" cents={free.incomeCents} theme={theme} />
        <Line label="− Fixkosten" cents={-free.fixedExpenseCents} theme={theme} />
        {free.savingsGoalCents > 0 ? (
          <Line label="− Sparziel" cents={-free.savingsGoalCents} theme={theme} />
        ) : null}
        <Line label="= Frei verfügbares Einkommen" cents={free.freeCents} theme={theme} strong />
        <Line label="− Bereits ausgegeben" cents={-free.variableExpenseCents} theme={theme} />
        <Line label="= Rest" cents={free.remainingCents} theme={theme} strong />
      </Card>

      <QuickAdd />

      {insights.length > 0 ? (
        <Card>
          <CardTitle>Empfehlungen</CardTitle>
          {insights.map((i) => (
            <View key={i.id} style={[styles.insight, { borderLeftColor: toneColor(i.tone, theme) }]}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>
                {toneIcon(i.tone)} {i.title}
              </Text>
              <Text style={{ color: theme.muted, lineHeight: 20 }}>{i.text}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <CardTitle>Nach Kategorie</CardTitle>
        <Segmented
          value={breakdown}
          onChange={setBreakdown}
          options={[
            { value: 'expense', label: 'Ausgaben' },
            { value: 'income', label: 'Einnahmen' },
          ]}
        />
        <View style={{ height: 16 }} />
        {totals.length === 0 ? (
          <Text style={[styles.empty, { color: theme.muted }]}>
            Keine {breakdown === 'expense' ? 'Ausgaben' : 'Einnahmen'} in diesem Monat.
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
              <View style={[styles.track, styles.thinTrack, { backgroundColor: theme.track }]}>
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
      </Card>

      <Pressable onPress={() => router.push('/fixposten')} style={styles.link}>
        <Text style={{ color: theme.tint, fontWeight: '600' }}>Fixkosten & Einkommen verwalten ›</Text>
      </Pressable>
    </ScrollView>
  );
}

function Line(props: { label: string; cents: number; theme: Theme; strong?: boolean }) {
  const { theme, strong } = props;
  return (
    <View style={[styles.line, strong && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[{ color: strong ? theme.text : theme.muted }, strong && styles.strong]}>
        {props.label}
      </Text>
      <Text
        style={[
          styles.lineValue,
          { color: strong ? theme.text : theme.muted },
          strong && styles.strong,
        ]}>
        {formatCents(props.cents)}
      </Text>
    </View>
  );
}

function toneColor(tone: InsightTone, theme: Theme) {
  return tone === 'warning' ? theme.warning : tone === 'good' ? theme.income : theme.tint;
}

function toneIcon(tone: InsightTone) {
  return tone === 'warning' ? '⚠︎' : tone === 'good' ? '✓' : 'ℹ︎';
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  caption: { fontSize: 13, fontWeight: '500' },
  hero: { fontSize: 36, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 14, marginBottom: 10 },
  thinTrack: { height: 8, marginTop: 0, marginBottom: 0 },
  fill: { height: '100%', borderRadius: 5 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  lineValue: { fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '700' },
  insight: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 14 },
  insightTitle: { fontWeight: '700', marginBottom: 2 },
  empty: { textAlign: 'center', paddingVertical: 12 },
  barRow: { marginBottom: 14 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barName: { fontSize: 15, fontWeight: '500' },
  barValue: { fontSize: 13, fontVariant: ['tabular-nums'] },
  link: { alignItems: 'center', paddingVertical: 4 },
});
