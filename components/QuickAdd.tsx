import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, CardTitle, Chip, inputStyle } from '@/components/ui';
import {
  categoryColor,
  formatCents,
  monthKey,
  parseAmount,
  splitEvenly,
  toDateString,
  type Shop,
} from '@/lib/budget';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/**
 * Schnell-Erfassung: Betrag eintippen, auf einen Laden tippen – fertig.
 * Gebucht wird auf heute, bezahlt von der gewählten Person.
 */
export function QuickAdd() {
  const theme = useTheme();
  const { shops, members, viewer, settings, addTransaction, removeTransaction, setMonth } =
    useStore();
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState(viewer ?? members[0].id);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ id: string; text: string } | null>(null);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (viewer) setPayer(viewer);
  }, [viewer]);
  useEffect(() => {
    if (!members.some((m) => m.id === payer)) setPayer(members[0].id);
  }, [members, payer]);
  useEffect(() => {
    if (!last) return;
    const timer = setTimeout(() => setLast(null), 6000);
    return () => clearTimeout(timer);
  }, [last]);

  function book(shop: Shop) {
    const cents = parseAmount(amount);
    if (cents === null) {
      setError('Erst den Betrag eingeben, dann auf den Laden tippen.');
      input.current?.focus();
      return;
    }
    const today = toDateString(new Date());
    const split =
      settings.splitByDefault && members.length > 1
        ? splitEvenly(cents, members.map((m) => m.id))
        : undefined;
    const id = addTransaction({
      type: 'expense',
      amountCents: cents,
      category: shop.category,
      note: shop.name,
      date: today,
      paidBy: payer,
      split,
    });
    setMonth(monthKey(today));
    setAmount('');
    setError(null);
    setLast({ id, text: `${shop.name}: ${formatCents(cents)} gespeichert` });
  }

  return (
    <Card>
      <CardTitle
        right={
          <Pressable onPress={() => router.push('/buchung')} hitSlop={8}>
            <Text style={{ color: theme.tint, fontWeight: '600' }}>Ausführlich…</Text>
          </Pressable>
        }>
        Schnell erfassen
      </CardTitle>
      <TextInput
        ref={input}
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setError(null);
        }}
        placeholder="Betrag in €, z. B. 23,40"
        placeholderTextColor={theme.muted}
        keyboardType="decimal-pad"
        returnKeyType="done"
        style={[
          inputStyle,
          styles.amount,
          { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
        ]}
      />
      {members.length > 1 ? (
        <View style={styles.payerRow}>
          <Text style={{ color: theme.muted, fontSize: 13 }}>Bezahlt von</Text>
          {members.map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              color={m.color}
              selected={payer === m.id}
              onPress={() => setPayer(m.id)}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.shops}>
        {shops.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => book(s)}
            accessibilityLabel={`${s.name} buchen`}
            style={({ pressed }) => [
              styles.shop,
              { backgroundColor: theme.background, borderColor: theme.border },
              pressed && { opacity: 0.5 },
            ]}>
            <View style={[styles.shopDot, { backgroundColor: categoryColor('expense', s.category) }]} />
            <Text style={[styles.shopText, { color: theme.text }]} numberOfLines={1}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={[styles.message, { color: theme.expense }]}>{error}</Text> : null}
      {last ? (
        <View style={[styles.toast, { backgroundColor: theme.track }]}>
          <Text style={{ color: theme.text, flex: 1 }}>✓ {last.text}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              removeTransaction(last.id);
              setLast(null);
            }}>
            <Text style={{ color: theme.tint, fontWeight: '700' }}>Rückgängig</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 20, fontWeight: '600' },
  payerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  shops: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  shop: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '30%',
    flexGrow: 1,
  },
  shopDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  shopText: { fontSize: 15, fontWeight: '600' },
  message: { marginTop: 10 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
});
