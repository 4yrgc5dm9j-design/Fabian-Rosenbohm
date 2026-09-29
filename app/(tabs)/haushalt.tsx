import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button, Card, CardTitle, Chip, inputStyle, Label } from '@/components/ui';
import {
  balances,
  centsToInput,
  EXPENSE_CATEGORIES,
  entriesUntil,
  formatCents,
  monthKey,
  parseAmount,
  simplifyDebts,
  toDateString,
} from '@/lib/budget';
import { confirm, notify } from '@/lib/confirm';
import { exportCode, parseExportCode, toCsv } from '@/lib/household';
import { useMemberName, useStore } from '@/lib/store';
import { useTheme, type Theme } from '@/lib/theme';

export default function HouseholdScreen() {
  const theme = useTheme();
  const store = useStore();
  const { members, transactions, fixed, settlements, shops, settings } = store;
  const memberName = useMemberName();
  const today = toDateString(new Date());

  const [newMember, setNewMember] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('Lebensmittel');
  const [goal, setGoal] = useState(settings.savingsGoalCents ? centsToInput(settings.savingsGoalCents) : '');
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState<string | null>(null);

  const debts = useMemo(() => {
    const entries = entriesUntil(transactions, fixed, monthKey(today));
    return simplifyDebts(balances(entries, settlements, members.map((m) => m.id)));
  }, [transactions, fixed, settlements, members, today]);

  async function share(message: string, title: string) {
    try {
      await Share.share({ message, title });
    } catch {
      // Im Browser gibt es nicht überall ein Teilen-Menü – dann Text zum Kopieren anzeigen.
    }
    setExportText(message);
  }

  function doImport() {
    try {
      const other = parseExportCode(importText);
      store.importHousehold(other);
      setImportText('');
      notify(
        'Zusammengeführt',
        `${other.members.length} Person(en), ${other.transactions.length} Buchungen und ${other.fixed.length} Fixposten wurden übernommen.`,
      );
    } catch (e) {
      notify('Import fehlgeschlagen', (e as Error).message);
    }
  }

  async function removeMember(id: string) {
    if (!(await confirm('Person entfernen', `${memberName(id)} wirklich entfernen?`, 'Entfernen'))) return;
    if (!store.removeMember(id)) {
      notify('Nicht möglich', 'Personen mit Buchungen, Fixposten oder Ausgleichszahlungen können nicht entfernt werden. Du kannst sie aber umbenennen.');
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Card>
        <CardTitle>Personen im Haushalt</CardTitle>
        {members.map((m) => (
          <View key={m.id} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: m.color }]}>
              <Text style={styles.avatarText}>{m.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <TextInput
              defaultValue={m.name}
              onChangeText={(t) => t.trim() && store.renameMember(m.id, t.trim())}
              accessibilityLabel="Name"
              style={[inputStyle, styles.flex, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, paddingVertical: 8 }]}
            />
            {members.length > 1 ? (
              <Pressable onPress={() => removeMember(m.id)} hitSlop={8} accessibilityLabel={`${m.name} entfernen`}>
                <Text style={{ color: theme.expense, fontSize: 20 }}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <View style={styles.row}>
          <TextInput
            value={newMember}
            onChangeText={setNewMember}
            placeholder="Name, z. B. Anna"
            placeholderTextColor={theme.muted}
            onSubmitEditing={() => {
              if (newMember.trim()) store.addMember(newMember.trim());
              setNewMember('');
            }}
            style={[inputStyle, styles.flex, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, paddingVertical: 8 }]}
          />
          <Pressable
            onPress={() => {
              if (newMember.trim()) store.addMember(newMember.trim());
              setNewMember('');
            }}
            style={[styles.smallBtn, { backgroundColor: theme.tint }]}>
            <Text style={styles.smallBtnText}>Hinzufügen</Text>
          </Pressable>
        </View>
        {members.length > 1 ? (
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={[styles.flex, { color: theme.text }]}>Neue Ausgaben automatisch gleichmäßig aufteilen</Text>
            <Switch value={settings.splitByDefault} onValueChange={(splitByDefault) => store.updateSettings({ splitByDefault })} />
          </View>
        ) : (
          <Text style={[styles.hint, { color: theme.muted }]}>
            Füge eine zweite Person hinzu, um Ausgaben zu teilen und zu sehen, wer wem etwas schuldet.
          </Text>
        )}
      </Card>

      {members.length > 1 ? (
        <Card>
          <CardTitle>Ausgleich</CardTitle>
          {debts.length === 0 ? (
            <Text style={{ color: theme.income }}>✓ Alles ausgeglichen – niemand schuldet jemandem etwas.</Text>
          ) : (
            debts.map((d) => (
              <View key={`${d.from}-${d.to}`} style={[styles.debt, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 15 }}>
                  <Text style={{ fontWeight: '700' }}>{memberName(d.from)}</Text> schuldet{' '}
                  <Text style={{ fontWeight: '700' }}>{memberName(d.to)}</Text>
                </Text>
                <Text style={[styles.debtAmount, { color: theme.expense }]}>{formatCents(d.cents)}</Text>
                <Button
                  label="Als bezahlt markieren"
                  variant="outline"
                  onPress={async () => {
                    const ok = await confirm(
                      'Ausgleich erfassen',
                      `${memberName(d.from)} hat ${memberName(d.to)} ${formatCents(d.cents)} überwiesen?`,
                      'Ja, bezahlt',
                    );
                    if (ok) store.addSettlement({ from: d.from, to: d.to, cents: d.cents, date: today });
                  }}
                />
              </View>
            ))
          )}
          <Text style={[styles.hint, { color: theme.muted }]}>
            Berechnet aus allen geteilten Ausgaben: Wer mehr bezahlt hat als sein Anteil, bekommt Geld zurück.
          </Text>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Budget</CardTitle>
        <Pressable onPress={() => router.push('/fixposten')} style={[styles.linkRow, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text, flex: 1 }}>Fixkosten & Einkommen</Text>
          <Text style={{ color: theme.muted }}>{fixed.length} Posten ›</Text>
        </Pressable>
        <Label>Sparziel pro Monat (€)</Label>
        <TextInput
          value={goal}
          onChangeText={(t) => {
            setGoal(t);
            store.updateSettings({ savingsGoalCents: parseAmount(t) ?? 0 });
          }}
          placeholder="z. B. 300"
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
          style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <Text style={[styles.hint, { color: theme.muted }]}>
          Das Sparziel wird vom frei verfügbaren Einkommen abgezogen, damit du es nicht aus Versehen ausgibst.
        </Text>
      </Card>

      <Card>
        <CardTitle>Schnell-Buttons (Läden)</CardTitle>
        {shops.map((s, i) => (
          <View key={s.id} style={styles.row}>
            <Text style={[styles.flex, { color: theme.text, fontWeight: '600' }]}>{s.name}</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{s.category}</Text>
            <Arrow label="↑" disabled={i === 0} onPress={() => store.moveShop(s.id, -1)} theme={theme} />
            <Arrow label="↓" disabled={i === shops.length - 1} onPress={() => store.moveShop(s.id, 1)} theme={theme} />
            <Pressable onPress={() => store.removeShop(s.id)} hitSlop={8} accessibilityLabel={`${s.name} entfernen`}>
              <Text style={{ color: theme.expense, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Label>Neuer Laden</Label>
        <TextInput
          value={shopName}
          onChangeText={setShopName}
          placeholder="z. B. Netto, Penny, IKEA"
          placeholderTextColor={theme.muted}
          style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <View style={[styles.wrap, { marginTop: 10 }]}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c.name} label={c.name} color={c.color} selected={shopCategory === c.name} onPress={() => setShopCategory(c.name)} />
          ))}
        </View>
        <View style={{ height: 12 }} />
        <Button
          label="Laden hinzufügen"
          onPress={() => {
            if (!shopName.trim()) return;
            store.addShop(shopName.trim(), shopCategory);
            setShopName('');
          }}
        />
      </Card>

      <Card>
        <CardTitle>Haushalt zusammenführen</CardTitle>
        <Text style={{ color: theme.muted, lineHeight: 20 }}>
          Nutzt ihr die App auf zwei Handys? Eine Person teilt ihren Code, die andere fügt ihn hier ein. Personen,
          Buchungen und Fixposten werden zusammengeführt. Danach kann der Code auch in die Gegenrichtung
          geschickt werden, damit beide alles sehen. Tipp: Gebt euch vorher unter „Personen“ eure echten Namen, sonst heißen beide „Ich“.
        </Text>
        <View style={{ height: 12 }} />
        <Button label="Meinen Code teilen" onPress={() => share(exportCode(store), 'Haushaltsbuch-Code')} />
        {exportText ? (
          <TextInput
            value={exportText}
            editable={false}
            multiline
            selectTextOnFocus
            style={[inputStyle, styles.code, { color: theme.muted, borderColor: theme.border, backgroundColor: theme.background }]}
          />
        ) : null}
        <Label>Code der anderen Person einfügen</Label>
        <TextInput
          value={importText}
          onChangeText={setImportText}
          placeholder="HAUSHALTSBUCH:{…}"
          placeholderTextColor={theme.muted}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={[inputStyle, styles.code, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <View style={{ height: 12 }} />
        <Button label="Zusammenführen" onPress={doImport} variant="outline" />
      </Card>

      <Card>
        <CardTitle>Daten</CardTitle>
        <Button label="Buchungen als CSV (Excel) teilen" variant="outline" onPress={() => share(toCsv(store), 'Haushaltsbuch.csv')} />
        <View style={{ height: 10 }} />
        <Button
          label="Alle Daten löschen"
          color={theme.expense}
          variant="outline"
          onPress={async () => {
            if (await confirm('Alles löschen?', 'Alle Personen, Buchungen, Fixposten und Einstellungen werden gelöscht.', 'Löschen')) {
              store.resetAll();
              setGoal('');
            }
          }}
        />
      </Card>
    </ScrollView>
  );
}

function Arrow(props: { label: string; disabled: boolean; onPress: () => void; theme: Theme }) {
  return (
    <Pressable onPress={props.onPress} disabled={props.disabled} hitSlop={6} style={{ opacity: props.disabled ? 0.25 : 1 }}>
      <Text style={{ color: props.theme.tint, fontSize: 18, paddingHorizontal: 4 }}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '700' },
  smallBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  smallBtnText: { color: '#FFFFFF', fontWeight: '700' },
  hint: { fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  debt: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 8, marginBottom: 10 },
  debtAmount: { fontSize: 22, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
  code: { minHeight: 70, marginTop: 10, fontSize: 12 },
});
