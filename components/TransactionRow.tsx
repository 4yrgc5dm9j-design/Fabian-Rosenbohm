import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryColor, formatCents, type Entry } from '@/lib/budget';
import { useMemberName, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type Props = {
  entry: Entry;
  onPress: () => void;
  onLongPress?: () => void;
};

export function TransactionRow({ entry: t, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const { members } = useStore();
  const memberName = useMemberName();
  const isIncome = t.type === 'income';

  const details: string[] = [];
  if (t.note && t.note !== t.category) details.push(t.note);
  if (members.length > 1) {
    details.push(
      t.split && t.split.length > 1
        ? `${memberName(t.paidBy)} · geteilt (${t.split.length})`
        : memberName(t.paidBy),
    );
  }
  if (t.fixedId) details.push('monatlich');

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
        {details.length > 0 ? (
          <Text style={[styles.note, { color: theme.muted }]} numberOfLines={1}>
            {details.join(' · ')}
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
