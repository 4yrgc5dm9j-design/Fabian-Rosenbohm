import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import { TransactionRow } from '@/components/TransactionRow';
import { inputStyle } from '@/components/ui';
import { ViewFilter } from '@/components/ViewFilter';
import {
  formatCents,
  formatDate,
  groupByDate,
  matchesSearch,
  sortTransactions,
  summarize,
  type Entry,
} from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { useMonthEntries } from '@/lib/useEntries';

export default function TransactionsScreen() {
  const { month, removeTransaction } = useStore();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const entries = useMonthEntries(month);

  const filtered = useMemo(() => entries.filter((e) => matchesSearch(e, query)), [entries, query]);
  const sections = useMemo(() => {
    const fixed = filtered.filter((e) => e.fixedId);
    const own = sortTransactions(filtered.filter((e) => !e.fixedId));
    const groups = groupByDate(own).map((g) => ({ title: formatDate(g.date), data: g.data }));
    return fixed.length > 0 ? [{ title: 'Fixposten (monatlich)', data: fixed }, ...groups] : groups;
  }, [filtered]);
  const sum = summarize(filtered);

  function open(e: Entry) {
    if (e.fixedId) router.push({ pathname: '/buchung', params: { fixedId: e.fixedId } });
    else router.push({ pathname: '/buchung', params: { id: e.id } });
  }

  async function confirmDelete(e: Entry) {
    if (e.fixedId) return open(e);
    const ok = await confirm(
      'Buchung löschen',
      `${e.note || e.category} über ${formatCents(e.amountCents)} löschen?`,
      'Löschen',
    );
    if (ok) removeTransaction(e.id);
  }

  return (
    <SectionList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <ViewFilter />
          <MonthSwitcher />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Suchen, z. B. Lidl oder Freizeit"
            placeholderTextColor={theme.muted}
            clearButtonMode="while-editing"
            style={[
              inputStyle,
              { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
            ]}
          />
          {filtered.length > 0 ? (
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              {filtered.length} Einträge · Einnahmen {formatCents(sum.incomeCents)} · Ausgaben{' '}
              {formatCents(sum.expenseCents)}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.muted }]}>
          {query ? 'Nichts gefunden.' : 'Noch keine Buchungen in diesem Monat.'}
        </Text>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionHeader, { color: theme.muted }]}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <TransactionRow entry={item} onPress={() => open(item)} onLongPress={() => confirmDelete(item)} />
      )}
      ListFooterComponent={
        sections.length > 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>
            Tippen zum Bearbeiten · Lange drücken zum Löschen
          </Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  header: { gap: 12, marginBottom: 4 },
  sectionHeader: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6, marginLeft: 4 },
  empty: { textAlign: 'center', marginTop: 32 },
  hint: { textAlign: 'center', fontSize: 12, marginTop: 20 },
});
