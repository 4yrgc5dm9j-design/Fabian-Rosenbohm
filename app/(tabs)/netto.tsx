import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button, Card, CardTitle, Chip, inputStyle, Label, Segmented } from '@/components/ui';
import { formatCents, monthKey, toDateString } from '@/lib/budget';
import { notify } from '@/lib/confirm';
import {
  calculateNetto,
  DEFAULT_NETTO_INPUT,
  STATES,
  TAX_YEAR,
  type NettoInput,
  type TaxClass,
} from '@/lib/netto';
import { useStore } from '@/lib/store';
import { useTheme, type Theme } from '@/lib/theme';

const TAX_CLASS_HINTS: Record<TaxClass, string> = {
  1: 'Ledig, geschieden oder verwitwet',
  2: 'Alleinerziehend (Entlastungsbetrag)',
  3: 'Verheiratet, Partner in Klasse V oder ohne Lohn',
  4: 'Verheiratet, beide verdienen ähnlich',
  5: 'Verheiratet, Partner in Klasse III',
  6: 'Zweit- oder Nebenjob',
};

/** Deutsche Zahleneingabe ("3.500,50") in eine Zahl umwandeln. */
function parseNumber(s: string): number {
  const n = Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function toInput(n: number): string {
  return n ? String(n).replace('.', ',') : '';
}

export default function NettoScreen() {
  const theme = useTheme();
  const { settings, updateSettings, members, viewer, addFixed } = useStore();
  const input: NettoInput = { ...DEFAULT_NETTO_INPUT, ...settings.netto };
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [grossText, setGrossText] = useState(toInput(input.grossMonthly));
  const [grossPeriod, setGrossPeriod] = useState<'month' | 'year'>('month');

  const set = (patch: Partial<NettoInput>) => updateSettings({ netto: { ...settings.netto, ...patch } });
  const result = calculateNetto(input);
  const f = period === 'year' ? 12 : 1;
  const money = (x: number) => formatCents(Math.round(x * f * 100));
  const taxes = result.lohnsteuer + result.soli + result.kirchensteuer;
  const social = result.rv + result.av + result.kv + result.pv;

  function changeGross(text: string, per = grossPeriod) {
    setGrossText(text);
    const value = parseNumber(text);
    set({ grossMonthly: per === 'year' ? value / 12 : value });
  }

  function takeOver() {
    const owner = viewer ?? members[0].id;
    addFixed({
      type: 'income',
      amountCents: Math.round(result.net * 100),
      category: 'Gehalt',
      note: `Nettogehalt (Steuerklasse ${input.taxClass})`,
      paidBy: owner,
      startMonth: monthKey(toDateString(new Date())),
    });
    notify(
      'Übernommen',
      `${formatCents(Math.round(result.net * 100))} wurden als monatliches Einkommen für ${members.find((m) => m.id === owner)?.name} angelegt. Du findest es unter „Fixkosten & Einkommen“.`,
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={[styles.caption, { color: theme.muted }]}>
          Netto {period === 'year' ? 'pro Jahr' : 'pro Monat'}
        </Text>
        <Text style={[styles.hero, { color: theme.income }]}>{money(result.net)}</Text>
        <StackedBar result={result} theme={theme} />
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'month', label: 'Monat' },
            { value: 'year', label: 'Jahr' },
          ]}
        />
        <View style={{ height: 8 }} />
        <Row label="Brutto" value={money(result.gross)} theme={theme} strong />
        <Row label="Lohnsteuer" value={`− ${money(result.lohnsteuer)}`} theme={theme} />
        <Row label="Solidaritätszuschlag" value={`− ${money(result.soli)}`} theme={theme} />
        {input.church ? (
          <Row
            label={`Kirchensteuer (${Math.round(result.details.churchRate * 100)} %)`}
            value={`− ${money(result.kirchensteuer)}`}
            theme={theme}
          />
        ) : null}
        <Row label="Rentenversicherung" value={`− ${money(result.rv)}`} theme={theme} />
        <Row label="Arbeitslosenversicherung" value={`− ${money(result.av)}`} theme={theme} />
        <Row
          label={input.health === 'privat' ? 'Private KV/PV (nach AG-Zuschuss)' : 'Krankenversicherung'}
          value={`− ${money(result.kv)}`}
          theme={theme}
        />
        {input.health === 'gesetzlich' ? (
          <Row
            label={`Pflegeversicherung (${(result.details.pvRateEmployee * 100).toLocaleString('de-DE')} %)`}
            value={`− ${money(result.pv)}`}
            theme={theme}
          />
        ) : null}
        <Row label="Netto" value={money(result.net)} theme={theme} strong />
        <View style={[styles.sep, { backgroundColor: theme.border }]} />
        <Row label="Steuern gesamt" value={money(taxes)} theme={theme} />
        <Row label="Sozialabgaben gesamt" value={money(social)} theme={theme} />
        <Row label="Arbeitgeber zahlt insgesamt ca." value={money(result.employerCosts)} theme={theme} />
        {result.kind !== 'regular' ? (
          <Text style={[styles.note, { color: theme.warning }]}>
            {result.kind === 'minijob'
              ? 'Minijob: Lohnsteuer wird meist pauschal vom Arbeitgeber gezahlt. Ohne Befreiung zahlst du 3,6 % Rentenversicherung.'
              : 'Midijob (Übergangsbereich 603,01–2.000 €): reduzierte Sozialabgaben.'}
          </Text>
        ) : null}
        <View style={{ height: 12 }} />
        <Button label="Als monatliches Einkommen übernehmen" onPress={takeOver} color={theme.income} />
      </Card>

      <Card>
        <CardTitle>Gehalt</CardTitle>
        <Segmented
          value={grossPeriod}
          onChange={(p) => {
            setGrossPeriod(p);
            changeGross(grossText, p);
          }}
          options={[
            { value: 'month', label: 'Brutto pro Monat' },
            { value: 'year', label: 'Brutto pro Jahr' },
          ]}
        />
        <TextInput
          value={grossText}
          onChangeText={(t) => changeGross(t)}
          keyboardType="decimal-pad"
          placeholder="z. B. 3.500"
          placeholderTextColor={theme.muted}
          style={[inputStyle, styles.big, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, marginTop: 12 }]}
        />

        <Label>Steuerklasse</Label>
        <View style={styles.wrap}>
          {([1, 2, 3, 4, 5, 6] as TaxClass[]).map((c) => (
            <Chip key={c} label={String(c)} selected={input.taxClass === c} onPress={() => set({ taxClass: c })} />
          ))}
        </View>
        <Text style={[styles.hint, { color: theme.muted }]}>{TAX_CLASS_HINTS[input.taxClass]}</Text>

        <Label>Bundesland</Label>
        <View style={styles.wrap}>
          {STATES.map((s) => (
            <Chip key={s.code} label={s.name} selected={input.state === s.code} onPress={() => set({ state: s.code })} />
          ))}
        </View>
        <Text style={[styles.hint, { color: theme.muted }]}>
          Wirkt auf die Kirchensteuer (Bayern/Baden-Württemberg 8 %, sonst 9 %) und die Pflegeversicherung (Sachsen +0,5 %).
        </Text>

        <Label>Geburtsjahr</Label>
        <TextInput
          value={String(input.birthYear)}
          onChangeText={(t) => {
            const y = parseInt(t.replace(/\D/g, ''), 10);
            if (!Number.isNaN(y)) set({ birthYear: y });
          }}
          keyboardType="number-pad"
          maxLength={4}
          style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <Text style={[styles.hint, { color: theme.muted }]}>
          Alter {TAX_YEAR}: {result.details.age} Jahre. Ab 23 ohne Kinder: Pflege-Zuschlag. Ab 64: Altersentlastungsbetrag
          {result.details.altersentlastung > 0 ? ` (${result.details.altersentlastung} € im Jahr)` : ''}.
        </Text>

        <SwitchRow label="Kirchensteuerpflichtig" value={input.church} onChange={(church) => set({ church })} theme={theme} />
      </Card>

      <Card>
        <CardTitle>Kinder</CardTitle>
        <Stepper label="Kinder insgesamt" value={input.children} step={1} onChange={(children) => set({ children, childrenUnder25: Math.min(input.childrenUnder25, children) })} theme={theme} />
        <Stepper label="davon unter 25 Jahre" value={input.childrenUnder25} step={1} max={input.children} onChange={(childrenUnder25) => set({ childrenUnder25 })} theme={theme} />
        <Stepper label="Kinderfreibeträge (Lohnsteuerkarte)" value={input.childAllowances} step={0.5} onChange={(childAllowances) => set({ childAllowances })} theme={theme} />
        <Text style={[styles.hint, { color: theme.muted }]}>
          Kinderfreibeträge senken Soli und Kirchensteuer. Pro Kind meist 0,5 (Steuerklasse I/IV) oder 1,0 (Steuerklasse III).
        </Text>
      </Card>

      <Card>
        <CardTitle>Versicherung</CardTitle>
        <Segmented
          value={input.health}
          onChange={(health) => set({ health })}
          options={[
            { value: 'gesetzlich', label: 'Gesetzlich' },
            { value: 'privat', label: 'Privat' },
          ]}
        />
        {input.health === 'gesetzlich' ? (
          <>
            <Label>Zusatzbeitrag der Krankenkasse (%)</Label>
            <TextInput
              defaultValue={toInput(Math.round(input.zusatzbeitrag * 10000) / 100)}
              onChangeText={(t) => set({ zusatzbeitrag: parseNumber(t) / 100 })}
              keyboardType="decimal-pad"
              style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
            <Text style={[styles.hint, { color: theme.muted }]}>Durchschnitt 2026: 2,9 %</Text>
          </>
        ) : (
          <>
            <Label>Monatsbeitrag Kranken- + Pflegeversicherung (€)</Label>
            <TextInput
              defaultValue={toInput(input.privateMonthly)}
              onChangeText={(t) => set({ privateMonthly: parseNumber(t) })}
              keyboardType="decimal-pad"
              placeholder="z. B. 650"
              placeholderTextColor={theme.muted}
              style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
            <Text style={[styles.hint, { color: theme.muted }]}>Der Arbeitgeberzuschuss (max. die Hälfte) wird automatisch abgezogen.</Text>
          </>
        )}
        <SwitchRow label="Rentenversicherungspflichtig" value={input.rvPflichtig} onChange={(rvPflichtig) => set({ rvPflichtig })} theme={theme} />
        <SwitchRow label="Arbeitslosenversicherungspflichtig" value={input.avPflichtig} onChange={(avPflichtig) => set({ avPflichtig })} theme={theme} />

        <Label>Steuerfreibetrag pro Jahr (€, optional)</Label>
        <TextInput
          defaultValue={toInput(input.annualAllowance)}
          onChangeText={(t) => set({ annualAllowance: parseNumber(t) })}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.muted}
          style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
      </Card>

      <Text style={[styles.footer, { color: theme.muted }]}>
        Berechnung nach dem amtlichen Programmablaufplan {TAX_YEAR} (Lohnsteuer, Soli, Kirchensteuer) und den
        Sozialversicherungswerten {TAX_YEAR}. Ohne Einmalzahlungen, geldwerte Vorteile und Faktorverfahren.
        Zu versteuerndes Einkommen: {result.details.zve.toLocaleString('de-DE')} €, Vorsorgepauschale:{' '}
        {result.details.vorsorgepauschale.toLocaleString('de-DE')} € (Jahreswerte). Alle Angaben ohne Gewähr.
      </Text>
    </ScrollView>
  );
}

function StackedBar({ result, theme }: { result: ReturnType<typeof calculateNetto>; theme: Theme }) {
  if (result.gross <= 0) return null;
  const parts = [
    { label: 'Netto', value: result.net, color: theme.chartIncome },
    { label: 'Steuern', value: result.lohnsteuer + result.soli + result.kirchensteuer, color: theme.chartExpense },
    { label: 'Sozialabgaben', value: result.rv + result.av + result.kv + result.pv, color: theme.muted },
  ];
  return (
    <View style={{ marginVertical: 12 }}>
      <View style={styles.stack}>
        {parts.map((p) =>
          p.value > 0 ? (
            <View key={p.label} style={{ flex: p.value, backgroundColor: p.color, height: 10, borderRadius: 3 }} />
          ) : null,
        )}
      </View>
      <View style={styles.legend}>
        {parts.map((p) => (
          <View key={p.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: p.color }]} />
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              {p.label} {Math.round((p.value / result.gross) * 100)} %
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Row(props: { label: string; value: string; theme: Theme; strong?: boolean }) {
  const { theme, strong } = props;
  return (
    <View style={styles.row}>
      <Text style={{ color: strong ? theme.text : theme.muted, fontWeight: strong ? '700' : '400', flex: 1 }}>
        {props.label}
      </Text>
      <Text style={{ color: theme.text, fontWeight: strong ? '700' : '500', fontVariant: ['tabular-nums'] }}>
        {props.value}
      </Text>
    </View>
  );
}

function SwitchRow(props: { label: string; value: boolean; onChange: (v: boolean) => void; theme: Theme }) {
  return (
    <View style={[styles.row, { marginTop: 14 }]}>
      <Text style={{ color: props.theme.text, flex: 1 }}>{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onChange} />
    </View>
  );
}

function Stepper(props: {
  label: string;
  value: number;
  step: number;
  max?: number;
  onChange: (v: number) => void;
  theme: Theme;
}) {
  const { theme } = props;
  const btn = (label: string, next: number, disabled: boolean) => (
    <Pressable
      disabled={disabled}
      onPress={() => props.onChange(next)}
      accessibilityLabel={`${props.label} ${label === '+' ? 'erhöhen' : 'verringern'}`}
      style={[styles.stepBtn, { borderColor: theme.border, opacity: disabled ? 0.3 : 1 }]}>
      <Text style={{ color: theme.tint, fontSize: 20, lineHeight: 22 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.row, { marginBottom: 8 }]}>
      <Text style={{ color: theme.text, flex: 1 }}>{props.label}</Text>
      {btn('−', props.value - props.step, props.value <= 0)}
      <Text style={[styles.stepValue, { color: theme.text }]}>{props.value.toLocaleString('de-DE')}</Text>
      {btn('+', props.value + props.step, props.max !== undefined && props.value >= props.max)}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  caption: { fontSize: 13, fontWeight: '500' },
  hero: { fontSize: 36, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  big: { fontSize: 22, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  note: { marginTop: 10, lineHeight: 19 },
  stack: { flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 34, textAlign: 'center', fontWeight: '700', fontSize: 16 },
  footer: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
});
