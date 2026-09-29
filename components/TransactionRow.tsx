import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryColor, formatCents, type Transaction } from '@/lib/budget';
import { useTheme } from '@/lib/theme';

type Props = {
  transaction: Transaction;
  onPress: () => void;
  onLongPress: () => void;
};

export function TransactionRow({ transaction: t, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const isIncome = t.type === 'income';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && { opacity: 0.6 },
      ]}>
      <View style={[styles.dot, { backgroundColor: categoryColor(t.type, t.category) }]} />
      <View style={styles.middle}>
        <Text style={[styles.category, { color: theme.text }]} numberOfLines={1}>
          {t.category}
        </Text>
        {t.note ? (
          <Text style={[styles.note, { color: theme.muted }]} numberOfLines={1}>
            {t.note}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.amount, { color: isIncome ? theme.income : theme.expense }]}>
        {isIncome ? '+' : '−'}
        {formatCents(t.amountCents)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  middle: { flex: 1, marginRight: 12 },
  category: { fontSize: 16, fontWeight: '500' },
  note: { fontSize: 13, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
