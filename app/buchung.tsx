import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, Chip, inputStyle, Label, Segmented } from '@/components/ui';
import {
  categoriesFor,
  centsToInput,
  formatCents,
  formatDate,
  formatMonth,
  isValidDateString,
  monthKey,
  parseAmount,
  shiftDate,
  shiftMonth,
  splitEvenly,
  splitTotal,
  toDateString,
  type Share,
  type TransactionType,
} from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type SplitMode = 'none' | 'even' | 'custom';

/**
 * Formular für Buchungen und Fixposten.
 * - ohne Parameter: neue Buchung (optional als monatlicher Fixposten)
 * - `id`: Buchung bearbeiten
 * - `fixedId`: Fixposten bearbeiten
 * - `fixed=1`: neuer Fixposten
 */
export default function TransactionForm() {
  const params = useLocalSearchParams<{ id?: string; fixedId?: string; fixed?: string; type?: string }>();
  const store = useStore();
  const { transactions, fixed, members, shops, month, viewer, settings } = store;
  const theme = useTheme();

  const existingTx = params.id ? transactions.find((t) => t.id === params.id) : undefined;
  const existingFixed = params.fixedId ? fixed.find((f) => f.id === params.fixedId) : undefined;
  const existing = existingTx ?? existingFixed;
  const multi = members.length > 1;

  const [type, setType] = useState<TransactionType>(
    existing?.type ?? (params.type === 'income' ? 'income' : 'expense'),
  );
  const [amount, setAmount] = useState(existing ? centsToInput(existing.amountCents) : '');
  const [category, setCategory] = useState(existing?.category ?? categoriesFor(type)[0].name);
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(() => existingTx?.date ?? defaultDate(month));
  const [recurring, setRecurring] = useState(Boolean(existingFixed) || params.fixed === '1');
  const [startMonth, setStartMonth] = useState(existingFixed?.startMonth ?? month);
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? viewer ?? members[0].id);
  const [splitMode, setSplitMode] = useState<SplitMode>(() => {
    if (existing?.split?.length) {
      const even = splitEvenly(existing.amountCents, existing.split.map((s) => s.memberId));
      return even.every((e, i) => e.cents === existing.split![i].cents) ? 'even' : 'custom';
    }
    return !existing && settings.splitByDefault && multi ? 'even' : 'none';
  });
  const [splitMembers, setSplitMembers] = useState<string[]>(
    existing?.split?.map((s) => s.memberId) ?? members.map((m) => m.id),
  );
  const [customShares, setCustomShares] = useState<Record<string, string>>(() =>
    Object.fromEntries((existing?.split ?? []).map((s) => [s.memberId, centsToInput(s.cents)])),
  );
  const [error, setError] = useState<string | null>(null);

  const amountCents = parseAmount(amount);
  const accent = type === 'income' ? theme.income : theme.expense;

  function changeType(next: TransactionType) {
    setType(next);
    if (!categoriesFor(next).some((c) => c.name === category)) setCategory(categoriesFor(next)[0].name);
  }

  function buildSplit(total: number): Share[] | undefined | string {
    if (!multi || splitMode === 'none') return undefined;
    if (splitMembers.length === 0) return 'Bitte mindestens eine Person für die Aufteilung wählen.';
    if (splitMode === 'even') return splitEvenly(total, splitMembers);
    const shares = splitMembers.map((memberId) => ({
      memberId,
      cents: parseAmount(customShares[memberId] ?? '') ?? 0,
    }));
    const sum = splitTotal(shares);
    if (sum !== total) {
      return `Die Anteile ergeben ${formatCents(sum)}, der Betrag ist aber ${formatCents(total)}.`;
    }
    return shares.filter((s) => s.cents > 0);
  }

  function save() {
    if (amountCents === null) return setError('Bitte einen gültigen Betrag eingeben, z. B. 12,50.');
    const split = buildSplit(amountCents);
    if (typeof split === 'string') return setError(split);
    const base = { type, amountCents, category, note: note.trim(), paidBy, split };

    if (recurring) {
      if (existingFixed) store.updateFixed(existingFixed.id, { ...base, startMonth });
      else store.addFixed({ ...base, startMonth });
      if (existingTx) store.removeTransaction(existingTx.id);
    } else {
      if (!isValidDateString(date)) return setError('Bitte ein gültiges Datum im Format JJJJ-MM-TT eingeben.');
      const input = { ...base, date };
      if (existingTx) store.updateTransaction(existingTx.id, input);
      else store.addTransaction(input);
      store.setMonth(monthKey(date));
    }
    router.back();
  }

  async function remove() {
    if (existingTx) {
      store.removeTransaction(existingTx.id);
      router.back();
    } else if (existingFixed) {
      const ok = await confirm(
        'Fixposten löschen',
        'Der Posten verschwindet auch aus allen vergangenen Monaten. Wenn er nur nicht mehr anfallen soll, nutze „Ab nächstem Monat beenden“.',
        'Löschen',
      );
      if (ok) {
        store.removeFixed(existingFixed.id);
        router.back();
      }
    }
  }

  function endFixed() {
    if (!existingFixed) return;
    store.updateFixed(existingFixed.id, { endMonth: month });
    router.back();
  }

  const title = existingFixed
    ? 'Fixposten bearbeiten'
    : existingTx
      ? 'Buchung bearbeiten'
      : recurring
        ? 'Neuer Fixposten'
        : 'Neue Buchung';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: 'Ausgabe', color: theme.expense },
            { value: 'income', label: 'Einnahme', color: theme.income },
          ]}
        />

        <Label>Betrag (€)</Label>
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
          style={[inputStyle, styles.amountInput, { color: accent, backgroundColor: theme.card, borderColor: theme.border }]}
        />

        {type === 'expense' && shops.length > 0 && !recurring ? (
          <>
            <Label>Wo? (setzt Notiz und Kategorie)</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {shops.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={note === s.name}
                  onPress={() => {
                    setNote(s.name);
                    setCategory(s.category);
                  }}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <Label>Kategorie</Label>
        <View style={styles.chips}>
          {categoriesFor(type).map((c) => (
            <Chip key={c.name} label={c.name} color={c.color} selected={c.name === category} onPress={() => setCategory(c.name)} />
          ))}
        </View>

        <Label>Notiz (optional)</Label>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={recurring ? 'z. B. Miete, Handyvertrag' : 'z. B. Wocheneinkauf'}
          placeholderTextColor={theme.muted}
          style={[inputStyle, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
        />

        {!existing ? (
          <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '600' }}>Jeden Monat wiederholen</Text>
              <Text style={{ color: theme.muted, fontSize: 12.5 }}>Für Miete, Gehalt, Verträge (Fixkosten)</Text>
            </View>
            <Switch value={recurring} onValueChange={setRecurring} />
          </View>
        ) : null}

        {recurring ? (
          <>
            <Label>Gilt ab</Label>
            <MonthStepper value={startMonth} onChange={setStartMonth} />
            {existingFixed?.endMonth ? (
              <Text style={[styles.hint, { color: theme.muted }]}>Endet nach {formatMonth(existingFixed.endMonth)}.</Text>
            ) : null}
          </>
        ) : (
          <>
            <Label>Datum</Label>
            <View style={styles.dateRow}>
              <StepButton label="‹" onPress={() => isValidDateString(date) && setDate(shiftDate(date, -1))} />
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
                style={[inputStyle, styles.dateInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />
              <StepButton label="›" onPress={() => isValidDateString(date) && setDate(shiftDate(date, 1))} />
            </View>
            <View style={styles.dateHelpers}>
              <Text style={{ color: theme.muted }}>{isValidDateString(date) ? formatDate(date) : 'Ungültiges Datum'}</Text>
              <Pressable onPress={() => setDate(toDateString(new Date()))} hitSlop={8}>
                <Text style={{ color: theme.tint, fontWeight: '600' }}>Heute</Text>
              </Pressable>
            </View>
          </>
        )}

        {multi ? (
          <>
            <Label>{type === 'expense' ? 'Bezahlt von' : 'Erhalten von'}</Label>
            <View style={styles.chips}>
              {members.map((m) => (
                <Chip key={m.id} label={m.name} color={m.color} selected={paidBy === m.id} onPress={() => setPaidBy(m.id)} />
              ))}
            </View>

            <Label>Aufteilen</Label>
            <Segmented
              value={splitMode}
              onChange={setSplitMode}
              options={[
                { value: 'none', label: 'Nicht teilen' },
                { value: 'even', label: 'Gleichmäßig' },
                { value: 'custom', label: 'Eigene Beträge' },
              ]}
            />
            {splitMode !== 'none' ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {members.map((m) => {
                  const included = splitMembers.includes(m.id);
                  const even = amountCents ? splitEvenly(amountCents, splitMembers) : [];
                  return (
                    <View key={m.id} style={styles.splitRow}>
                      <Switch
                        value={included}
                        onValueChange={(on) =>
                          setSplitMembers((prev) => (on ? [...prev, m.id] : prev.filter((x) => x !== m.id)))
                        }
                      />
                      <Text style={{ color: theme.text, flex: 1 }}>{m.name}</Text>
                      {splitMode === 'even' ? (
                        <Text style={{ color: theme.muted, fontVariant: ['tabular-nums'] }}>
                          {included && amountCents ? formatCents(even.find((e) => e.memberId === m.id)?.cents ?? 0) : '–'}
                        </Text>
                      ) : (
                        <TextInput
                          value={customShares[m.id] ?? ''}
                          editable={included}
                          onChangeText={(t) => {
                            setCustomShares((prev) => ({ ...prev, [m.id]: t }));
                            setError(null);
                          }}
                          placeholder="0,00"
                          placeholderTextColor={theme.muted}
                          keyboardType="decimal-pad"
                          style={[inputStyle, styles.shareInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, opacity: included ? 1 : 0.4 }]}
                        />
                      )}
                    </View>
                  );
                })}
                {splitMode === 'custom' && amountCents ? (
                  <CustomRest
                    total={amountCents}
                    used={splitTotal(splitMembers.map((id) => ({ memberId: id, cents: parseAmount(customShares[id] ?? '') ?? 0 })))}
                  />
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}

        <View style={{ height: 28 }} />
        <Button label="Speichern" onPress={save} color={accent} />

        {existingFixed && !existingFixed.endMonth ? (
          <Pressable onPress={endFixed} style={styles.secondary} hitSlop={8}>
            <Text style={{ color: theme.tint, fontWeight: '600' }}>
              Ab {formatMonth(shiftMonth(month, 1))} beenden
            </Text>
          </Pressable>
        ) : null}
        {existing ? (
          <Pressable onPress={remove} style={styles.secondary} hitSlop={8}>
            <Text style={{ color: theme.expense, fontWeight: '600' }}>
              {existingFixed ? 'Fixposten löschen' : 'Buchung löschen'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CustomRest({ total, used }: { total: number; used: number }) {
  const theme = useTheme();
  const rest = total - used;
  return (
    <Text style={{ color: rest === 0 ? theme.income : theme.warning, textAlign: 'right' }}>
      {rest === 0 ? '✓ Passt genau' : rest > 0 ? `Noch ${formatCents(rest)} zu verteilen` : `${formatCents(-rest)} zu viel`}
    </Text>
  );
}

function MonthStepper({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.dateRow}>
      <StepButton label="‹" onPress={() => onChange(shiftMonth(value, -1))} />
      <View style={[inputStyle, styles.dateInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, textAlign: 'center', fontSize: 16 }}>{formatMonth(value)}</Text>
      </View>
      <StepButton label="›" onPress={() => onChange(shiftMonth(value, 1))} />
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
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
  amountInput: { fontSize: 28, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hScroll: { gap: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    gap: 12,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, textAlign: 'center' },
  stepButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHelpers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  hint: { fontSize: 12.5, marginTop: 8 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareInput: { width: 110, paddingVertical: 8, textAlign: 'right' },
  error: { marginTop: 16 },
  secondary: { alignItems: 'center', marginTop: 20 },
});
