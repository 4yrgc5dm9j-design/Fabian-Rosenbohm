// Gespeicherter Zustand des Haushalts, Migration alter Daten und das
// Zusammenführen zweier Haushalte (z. B. von zwei Handys).

import {
  DEFAULT_SHOPS,
  MEMBER_COLORS,
  newId,
  type FixedItem,
  type Member,
  type Settlement,
  type Shop,
  type Transaction,
} from './budget.ts';
import type { NettoInput } from './netto.ts';

export type Settings = {
  /** Monatliches Sparziel in Cent, wird vom frei verfügbaren Einkommen abgezogen. */
  savingsGoalCents: number;
  /** Neue Ausgaben standardmäßig auf alle Personen aufteilen. */
  splitByDefault: boolean;
  /** Zuletzt verwendete Eingaben im Brutto-Netto-Rechner. */
  netto?: Partial<NettoInput>;
};

export type HouseholdData = {
  version: 2;
  members: Member[];
  transactions: Transaction[];
  fixed: FixedItem[];
  shops: Shop[];
  settlements: Settlement[];
  settings: Settings;
};

export function createHousehold(firstMemberName = 'Ich'): HouseholdData {
  return {
    version: 2,
    members: [{ id: newId(), name: firstMemberName, color: MEMBER_COLORS[0] }],
    transactions: [],
    fixed: [],
    shops: DEFAULT_SHOPS.map((s) => ({ ...s, id: newId() })),
    settlements: [],
    settings: { savingsGoalCents: 0, splitByDefault: false },
  };
}

type LegacyTransaction = Omit<Transaction, 'paidBy'> & { paidBy?: string };

/** Übernimmt Buchungen aus Version 1 (ohne Personen) in einen neuen Haushalt. */
export function migrateV1(legacy: LegacyTransaction[]): HouseholdData {
  const data = createHousehold();
  const me = data.members[0].id;
  data.transactions = legacy.map((t) => ({ ...t, paidBy: t.paidBy ?? me }));
  return data;
}

/** Ergänzt fehlende Felder, falls ein Export aus einer älteren Version stammt. */
export function normalize(raw: Partial<HouseholdData>): HouseholdData {
  const base = createHousehold();
  const members = raw.members?.length ? raw.members : base.members;
  return {
    version: 2,
    members,
    transactions: (raw.transactions ?? []).map((t) => ({ ...t, paidBy: t.paidBy ?? members[0].id })),
    fixed: raw.fixed ?? [],
    shops: raw.shops ?? base.shops,
    settlements: raw.settlements ?? [],
    settings: { ...base.settings, ...raw.settings },
  };
}

function stamp(item: { updatedAt?: number; createdAt?: number }): number {
  return item.updatedAt ?? item.createdAt ?? 0;
}

/** Vereinigt zwei Listen per `id`; bei Konflikten gewinnt die neuere Version. */
function mergeById<T extends { id: string; updatedAt?: number; createdAt?: number }>(
  mine: T[],
  theirs: T[],
): T[] {
  const byId = new Map(mine.map((x) => [x.id, x]));
  for (const t of theirs) {
    const m = byId.get(t.id);
    if (!m || stamp(t) > stamp(m)) byId.set(t.id, t);
  }
  return [...byId.values()];
}

/**
 * Führt einen fremden Haushalt (Export vom anderen Handy) mit dem eigenen zusammen.
 * Personen, Buchungen, Fixposten und Ausgleichszahlungen werden vereinigt;
 * Läden werden nach Namen zusammengelegt. Eigene Einstellungen bleiben erhalten.
 */
export function mergeHouseholds(mine: HouseholdData, theirs: HouseholdData): HouseholdData {
  const shopNames = new Set(mine.shops.map((s) => s.name.toLowerCase()));
  const members = mergeById(mine.members, theirs.members).map((m, i) =>
    // Neue Personen bekommen eine Farbe, die noch nicht vergeben ist.
    i >= mine.members.length && mine.members.some((x) => x.color === m.color)
      ? { ...m, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }
      : m,
  );
  return {
    ...mine,
    members,
    transactions: mergeById(mine.transactions, theirs.transactions),
    fixed: mergeById(mine.fixed, theirs.fixed),
    settlements: mergeById(mine.settlements, theirs.settlements),
    shops: [...mine.shops, ...theirs.shops.filter((s) => !shopNames.has(s.name.toLowerCase()))],
  };
}

const EXPORT_PREFIX = 'HAUSHALTSBUCH:';

export function exportCode(data: HouseholdData): string {
  return EXPORT_PREFIX + JSON.stringify(data);
}

/** Liest einen Export-Code. Wirft einen Fehler mit verständlicher Meldung. */
export function parseExportCode(code: string): HouseholdData {
  const trimmed = code.trim();
  if (!trimmed.startsWith(EXPORT_PREFIX)) {
    throw new Error('Das ist kein Haushaltsbuch-Code. Er beginnt mit „HAUSHALTSBUCH:“.');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed.slice(EXPORT_PREFIX.length));
  } catch {
    throw new Error('Der Code ist unvollständig. Bitte komplett kopieren.');
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as HouseholdData).transactions)) {
    throw new Error('Der Code enthält keine Buchungen.');
  }
  return normalize(raw as Partial<HouseholdData>);
}

/** CSV (Semikolon-getrennt, für Excel in Deutschland) aller Buchungen. */
export function toCsv(data: HouseholdData): string {
  const name = (id: string) => data.members.find((m) => m.id === id)?.name ?? '';
  const esc = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = [['Datum', 'Typ', 'Betrag', 'Kategorie', 'Notiz', 'Bezahlt von', 'Aufteilung']];
  for (const t of [...data.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      t.date,
      t.type === 'income' ? 'Einnahme' : 'Ausgabe',
      (t.amountCents / 100).toFixed(2).replace('.', ','),
      t.category,
      t.note,
      name(t.paidBy),
      (t.split ?? [])
        .map((s) => `${name(s.memberId)} ${(s.cents / 100).toFixed(2).replace('.', ',')}`)
        .join(', '),
    ]);
  }
  return rows.map((r) => r.map(esc).join(';')).join('\n');
}
