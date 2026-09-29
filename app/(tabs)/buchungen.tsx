import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Platform, SectionList, StyleSheet, Text, View } from 'react-native';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import { TransactionRow } from '@/components/TransactionRow';
import {
  formatCents,
  formatDate,
  groupByDate,
  inMonth,
  sortTransactions,
  type Transaction,
} from '@/lib/budget';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function TransactionsScreen() {
  const { transactions, month, remove } = useStore();
  const theme = useTheme();

  const sections = useMemo(
    () => groupByDate(sortTransactions(inMonth(transactions, month))),
    [transactions, month],
  );

  function confirmDelete(t: Transaction) {
    const message = `${t.category} über ${formatCents(t.amountCents)} löschen?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) remove(t.id);
      return;
    }
    Alert.alert('Buchung löschen', message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => remove(t.id) },
    ]);
  }

  return (
    <SectionList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <MonthSwitcher />
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.muted }]}>
          Noch keine Buchungen in diesem Monat.
        </Text>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionHeader, { color: theme.muted }]}>
          {formatDate(section.date)}
        </Text>
      )}
      renderItem={({ item }) => (
        <TransactionRow
          transaction={item}
          onPress={() => router.push({ pathname: '/buchung', params: { id: item.id } })}
          onLongPress={() => confirmDelete(item)}
        />
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
  content: { padding: 16 },
  header: { marginBottom: 8 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },
  empty: { textAlign: 'center', marginTop: 32 },
  hint: { textAlign: 'center', fontSize: 12, marginTop: 20 },
});
