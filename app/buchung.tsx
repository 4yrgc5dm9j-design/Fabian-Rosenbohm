import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  categoriesFor,
  centsToInput,
  formatDate,
  isValidDateString,
  monthKey,
  parseAmount,
  shiftDate,
  toDateString,
  type TransactionType,
} from '@/lib/budget';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/** Formular zum Anlegen (ohne `id`) oder Bearbeiten (mit `id`) einer Buchung. */
export default function TransactionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { transactions, month, setMonth, add, update, remove } = useStore();
  const theme = useTheme();
  const existing = id ? transactions.find((t) => t.id === id) : undefined;

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? centsToInput(existing.amountCents) : '');
  const [category, setCategory] = useState(existing?.category ?? categoriesFor('expense')[0].name);
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(() => existing?.date ?? defaultDate(month));
  const [error, setError] = useState<string | null>(null);

  function changeType(next: TransactionType) {
    setType(next);
    if (!categoriesFor(next).some((c) => c.name === category)) {
      setCategory(categoriesFor(next)[0].name);
    }
  }

  function save() {
    const amountCents = parseAmount(amount);
    if (amountCents === null) {
      setError('Bitte einen gültigen Betrag eingeben, z. B. 12,50.');
      return;
    }
    if (!isValidDateString(date)) {
      setError('Bitte ein gültiges Datum im Format JJJJ-MM-TT eingeben.');
      return;
    }
    const input = { type, amountCents, category, note: note.trim(), date };
    if (existing) update(existing.id, input);
    else add(input);
    // Den Monat der Buchung anzeigen, damit sie direkt sichtbar ist.
    setMonth(monthKey(date));
    router.back();
  }

  function deleteAndClose() {
    if (existing) remove(existing.id);
    router.back();
  }

  const accent = type === 'income' ? theme.income : theme.expense;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Buchung bearbeiten' : 'Neue Buchung' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.segment, { backgroundColor: theme.track }]}>
          {(['expense', 'income'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => changeType(t)}
              style={[styles.segmentItem, type === t && { backgroundColor: theme.card }]}>
              <Text
                style={[
                  styles.segmentText,
                  { color: type === t ? (t === 'income' ? theme.income : theme.expense) : theme.muted },
                ]}>
                {t === 'expense' ? 'Ausgabe' : 'Einnahme'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.muted }]}>Betrag (€)</Text>
        <TextInput
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            setError(null);
          }}
          placeholder="0,00"
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
          autoFocus={!existing}
          style={[
            styles.input,
            styles.amountInput,
            { color: accent, backgroundColor: theme.card, borderColor: theme.border },
          ]}
        />

        <Text style={[styles.label, { color: theme.muted }]}>Kategorie</Text>
        <View style={styles.chips}>
          {categoriesFor(type).map((c) => {
            const selected = c.name === category;
            return (
              <Pressable
                key={c.name}
                onPress={() => setCategory(c.name)}
                style={[
                  styles.chip,
                  { borderColor: selected ? c.color : theme.border, backgroundColor: theme.card },
                  selected && { backgroundColor: c.color },
                ]}>
                <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.text }]}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.muted }]}>Datum</Text>
        <View style={styles.dateRow}>
          <DateButton label="‹" onPress={() => isValidDateString(date) && setDate(shiftDate(date, -1))} />
          <TextInput
            value={date}
            onChangeText={(v) => {
              setDate(v);
              setError(null);
            }}
            placeholder="JJJJ-MM-TT"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              styles.dateInput,
              { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
            ]}
          />
          <DateButton label="›" onPress={() => isValidDateString(date) && setDate(shiftDate(date, 1))} />
        </View>
        <View style={styles.dateHelpers}>
          <Text style={{ color: theme.muted }}>
            {isValidDateString(date) ? formatDate(date) : 'Ungültiges Datum'}
          </Text>
          <Pressable onPress={() => setDate(toDateString(new Date()))} hitSlop={8}>
            <Text style={{ color: theme.tint, fontWeight: '600' }}>Heute</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: theme.muted }]}>Notiz (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="z. B. Wocheneinkauf"
          placeholderTextColor={theme.muted}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
          ]}
        />

        {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}

        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.button, { backgroundColor: accent }, pressed && { opacity: 0.8 }]}>
          <Text style={styles.buttonText}>Speichern</Text>
        </Pressable>

        {existing ? (
          <Pressable onPress={deleteAndClose} style={styles.deleteButton} hitSlop={8}>
            <Text style={{ color: theme.expense, fontWeight: '600' }}>Buchung löschen</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DateButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dateButton,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && { opacity: 0.5 },
      ]}>
      <Text style={{ color: theme.tint, fontSize: 24, lineHeight: 28 }}>{label}</Text>
    </Pressable>
  );
}

/** Heute, falls der gewählte Monat der aktuelle ist, sonst der 1. des gewählten Monats. */
function defaultDate(month: string): string {
  const today = toDateString(new Date());
  return monthKey(today) === month ? today : `${month}-01`;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8 },
  segmentText: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  amountInput: { fontSize: 28, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '500' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, textAlign: 'center' },
  dateButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHelpers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  error: { marginTop: 16 },
  button: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  deleteButton: { alignItems: 'center', marginTop: 20 },
});
