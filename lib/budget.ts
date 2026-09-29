// Reine Logik des Haushaltsbuchs – ohne React/React Native, damit sie
// direkt mit `node --test` getestet werden kann.

export type TransactionType = 'expense' | 'income';

/** Anteil einer Person an einer geteilten Buchung. */
export type Share = { memberId: string; cents: number };

export type Transaction = {
  id: string;
  type: TransactionType;
  /** Betrag in Cent, immer positiv. */
  amountCents: number;
  category: string;
  note: string;
  /** Datum im Format YYYY-MM-DD. */
  date: string;
  createdAt: number;
  updatedAt?: number;
  /** Wer bezahlt (Ausgabe) bzw. erhalten (Einnahme) hat. */
  paidBy: string;
  /** Aufteilung auf Personen. Leer/fehlend = gehört komplett `paidBy`. */
  split?: Share[];
};

/** Monatlich wiederkehrender Posten (Miete, Gehalt, Handyvertrag …). */
export type FixedItem = {
  id: string;
  type: TransactionType;
  amountCents: number;
  category: string;
  note: string;
  paidBy: string;
  split?: Share[];
  /** Erster Monat (YYYY-MM), in dem der Posten zählt. */
  startMonth: string;
  /** Letzter Monat (YYYY-MM), in dem der Posten zählt. Fehlt = unbegrenzt. */
  endMonth?: string;
  updatedAt: number;
};

/** Eine Buchung oder die Monatsinstanz eines Fixpostens. */
export type Entry = Transaction & { fixedId?: string };

export type Member = { id: string; name: string; color: string; updatedAt?: number };

export type Shop = { id: string; name: string; category: string };

/** Ausgleichszahlung zwischen zwei Personen. */
export type Settlement = {
  id: string;
  from: string;
  to: string;
  cents: number;
  date: string;
  createdAt: number;
};

export type Category = { name: string; color: string };

export const EXPENSE_CATEGORIES: Category[] = [
  { name: 'Lebensmittel', color: '#2E9E6B' },
  { name: 'Wohnen', color: '#3B6FD8' },
  { name: 'Mobilität', color: '#D98A1E' },
  { name: 'Freizeit', color: '#B8499E' },
  { name: 'Restaurant', color: '#E0664A' },
  { name: 'Drogerie', color: '#5AA6D6' },
  { name: 'Gesundheit', color: '#D84B4B' },
  { name: 'Kleidung', color: '#7A5CD6' },
  { name: 'Verträge', color: '#1E98B0' },
  { name: 'Versicherungen', color: '#4B5FA8' },
  { name: 'Sparen', color: '#8AA83A' },
  { name: 'Sonstiges', color: '#7C8591' },
];

export const INCOME_CATEGORIES: Category[] = [
  { name: 'Gehalt', color: '#2E9E6B' },
  { name: 'Nebenjob', color: '#3B6FD8' },
  { name: 'Kindergeld', color: '#D98A1E' },
  { name: 'Geschenk', color: '#B8499E' },
  { name: 'Sonstiges', color: '#7C8591' },
];

/** Kategorien, die eher „Wünsche“ als „Bedürfnisse“ sind (für Empfehlungen). */
export const WANTS_CATEGORIES = ['Freizeit', 'Restaurant', 'Kleidung'];

export const MEMBER_COLORS = ['#2E6FD8', '#D9731E', '#2E9E6B', '#B8499E', '#7A5CD6', '#1E98B0'];

export const DEFAULT_SHOPS: Omit<Shop, 'id'>[] = [
  { name: 'Lidl', category: 'Lebensmittel' },
  { name: 'Aldi', category: 'Lebensmittel' },
  { name: 'Rewe', category: 'Lebensmittel' },
  { name: 'Edeka', category: 'Lebensmittel' },
  { name: 'Kaufland', category: 'Lebensmittel' },
  { name: 'Bäcker', category: 'Lebensmittel' },
  { name: 'dm', category: 'Drogerie' },
  { name: 'Rossmann', category: 'Drogerie' },
  { name: 'Tankstelle', category: 'Mobilität' },
  { name: 'Apotheke', category: 'Gesundheit' },
  { name: 'Amazon', category: 'Sonstiges' },
  { name: 'Restaurant', category: 'Restaurant' },
];

export function categoriesFor(type: TransactionType): Category[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export function categoryColor(type: TransactionType, name: string): string {
  return categoriesFor(type).find((c) => c.name === name)?.color ?? '#7C8591';
}

/**
 * Wandelt eine Benutzereingabe wie "12,50", "1.234,5" oder "7" in Cent um.
 * Gibt `null` zurück, wenn die Eingabe kein gültiger positiver Betrag ist.
 */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/\s|€/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    // Deutsches Format: Punkte sind Tausendertrenner, Komma ist Dezimaltrenner.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" ohne Komma als Tausendertrenner lesen.
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 ? cents : null;
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
  return euro.format(cents / 100);
}

/** Kurzform für enge Stellen, z. B. Diagrammbeschriftungen: "1,2 Tsd. €". */
export function formatCentsShort(cents: number): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1000) {
    return `${(euros / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tsd. €`;
  }
  return `${Math.round(euros).toLocaleString('de-DE')} €`;
}

/** Wandelt Cent in einen editierbaren Text wie "12,50" um. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function shiftDate(s: string, days: number): string {
  const [y, m, d] = s.split('-').map(Number);
  return toDateString(new Date(y, m - 1, d + days));
}

export function formatDate(s: string): string {
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}

/** Monatsschlüssel im Format YYYY-MM. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatMonthShort(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Fixposten & Monatseinträge

export function fixedActiveIn(item: FixedItem, month: string): boolean {
  return item.startMonth <= month && (!item.endMonth || month <= item.endMonth);
}

/** Alle Einträge eines Monats: Buchungen plus aktive Fixposten (am 1. des Monats). */
export function entriesForMonth(
  transactions: Transaction[],
  fixed: FixedItem[],
  month: string,
): Entry[] {
  const own: Entry[] = transactions.filter((t) => monthKey(t.date) === month);
  const fixedEntries: Entry[] = fixed
    .filter((f) => fixedActiveIn(f, month))
    .map((f) => ({
      id: `fixed:${f.id}:${month}`,
      fixedId: f.id,
      type: f.type,
      amountCents: f.amountCents,
      category: f.category,
      note: f.note,
      date: `${month}-01`,
      createdAt: 0,
      paidBy: f.paidBy,
      split: f.split,
    }));
  return [...fixedEntries, ...own];
}

/** Alle Einträge vom ersten erfassten Monat bis einschließlich `untilMonth`. */
export function entriesUntil(
  transactions: Transaction[],
  fixed: FixedItem[],
  untilMonth: string,
): Entry[] {
  const starts = [
    ...transactions.map((t) => monthKey(t.date)),
    ...fixed.map((f) => f.startMonth),
  ].filter((m) => m <= untilMonth);
  if (starts.length === 0) return [];
  let month = starts.reduce((a, b) => (a < b ? a : b));
  const result: Entry[] = [];
  while (month <= untilMonth) {
    result.push(...entriesForMonth(transactions, fixed, month));
    month = shiftMonth(month, 1);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Personen & Aufteilung

/** Anteil einer Person an einem Eintrag in Cent. */
export function shareOf(entry: Entry, memberId: string): number {
  if (entry.split && entry.split.length > 0) {
    return entry.split.find((s) => s.memberId === memberId)?.cents ?? 0;
  }
  return entry.paidBy === memberId ? entry.amountCents : 0;
}

/**
 * Einträge aus Sicht einer Person: Beträge werden auf deren Anteil reduziert,
 * Einträge ohne Anteil fallen weg. `null` = ganzer Haushalt (unverändert).
 */
export function viewFor(entries: Entry[], memberId: string | null): Entry[] {
  if (!memberId) return entries;
  const result: Entry[] = [];
  for (const e of entries) {
    const cents = shareOf(e, memberId);
    if (cents > 0) result.push({ ...e, amountCents: cents });
  }
  return result;
}

/** Teilt einen Betrag gleichmäßig; Rest-Cents gehen an die ersten Personen. */
export function splitEvenly(totalCents: number, memberIds: string[]): Share[] {
  if (memberIds.length === 0) return [];
  const base = Math.floor(totalCents / memberIds.length);
  let rest = totalCents - base * memberIds.length;
  return memberIds.map((memberId) => {
    const extra = rest > 0 ? 1 : 0;
    rest -= extra;
    return { memberId, cents: base + extra };
  });
}

export function splitTotal(split: Share[]): number {
  return split.reduce((sum, s) => sum + s.cents, 0);
}

/**
 * Salden zwischen Personen aus geteilten Ausgaben und Ausgleichszahlungen.
 * Positiv = bekommt noch Geld, negativ = schuldet Geld.
 */
export function balances(
  entries: Entry[],
  settlements: Settlement[],
  memberIds: string[],
): Map<string, number> {
  const result = new Map(memberIds.map((id) => [id, 0]));
  const add = (id: string, cents: number) => result.set(id, (result.get(id) ?? 0) + cents);
  for (const e of entries) {
    if (e.type !== 'expense' || !e.split || e.split.length === 0) continue;
    add(e.paidBy, e.amountCents);
    for (const s of e.split) add(s.memberId, -s.cents);
  }
  for (const s of settlements) {
    add(s.from, s.cents);
    add(s.to, -s.cents);
  }
  return result;
}

export type Debt = { from: string; to: string; cents: number };

/** Möglichst wenige Überweisungen, um alle Salden auszugleichen. */
export function simplifyDebts(balanceMap: Map<string, number>): Debt[] {
  const debtors = [...balanceMap]
    .filter(([, c]) => c < 0)
    .map(([id, c]) => ({ id, cents: -c }))
    .sort((a, b) => b.cents - a.cents);
  const creditors = [...balanceMap]
    .filter(([, c]) => c > 0)
    .map(([id, c]) => ({ id, cents: c }))
    .sort((a, b) => b.cents - a.cents);
  const debts: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const cents = Math.min(debtors[i].cents, creditors[j].cents);
    if (cents > 0) debts.push({ from: debtors[i].id, to: creditors[j].id, cents });
    debtors[i].cents -= cents;
    creditors[j].cents -= cents;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }
  return debts;
}

// ---------------------------------------------------------------------------
// Auswertungen

export function inMonth<T extends { date: string }>(items: T[], key: string): T[] {
  return items.filter((t) => monthKey(t.date) === key);
}

/** Neueste zuerst; bei gleichem Datum zuletzt erfasste zuerst. */
export function sortTransactions<T extends Transaction>(transactions: T[]): T[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
}

export type Summary = { incomeCents: number; expenseCents: number; balanceCents: number };

export function summarize(entries: Entry[]): Summary {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const t of entries) {
    if (t.type === 'income') incomeCents += t.amountCents;
    else expenseCents += t.amountCents;
  }
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

export type FreeIncome = {
  incomeCents: number;
  fixedExpenseCents: number;
  savingsGoalCents: number;
  /** Einkommen − Fixkosten − Sparziel. */
  freeCents: number;
  variableExpenseCents: number;
  /** Frei verfügbar − bereits ausgegeben. */
  remainingCents: number;
  /** Nur im laufenden Monat: verbleibende Tage inkl. heute. */
  daysLeft: number | null;
  perDayCents: number | null;
};

/** Frei verfügbares Einkommen eines Monats. */
export function freeIncome(
  entries: Entry[],
  month: string,
  today: string,
  savingsGoalCents = 0,
): FreeIncome {
  let incomeCents = 0;
  let fixedExpenseCents = 0;
  let variableExpenseCents = 0;
  for (const e of entries) {
    if (e.type === 'income') incomeCents += e.amountCents;
    else if (e.fixedId) fixedExpenseCents += e.amountCents;
    else variableExpenseCents += e.amountCents;
  }
  const freeCents = incomeCents - fixedExpenseCents - savingsGoalCents;
  const remainingCents = freeCents - variableExpenseCents;
  let daysLeft: number | null = null;
  let perDayCents: number | null = null;
  if (monthKey(today) === month) {
    daysLeft = daysInMonth(month) - Number(today.slice(8, 10)) + 1;
    perDayCents = Math.floor(Math.max(remainingCents, 0) / daysLeft);
  }
  return {
    incomeCents,
    fixedExpenseCents,
    savingsGoalCents,
    freeCents,
    variableExpenseCents,
    remainingCents,
    daysLeft,
    perDayCents,
  };
}

export type CategoryTotal = { category: string; color: string; cents: number; share: number };

/** Summen je Kategorie für einen Typ, absteigend sortiert, mit Anteil (0–1). */
export function totalsByCategory(entries: Entry[], type: TransactionType): CategoryTotal[] {
  const sums = new Map<string, number>();
  let total = 0;
  for (const t of entries) {
    if (t.type !== type) continue;
    sums.set(t.category, (sums.get(t.category) ?? 0) + t.amountCents);
    total += t.amountCents;
  }
  return [...sums.entries()]
    .map(([category, cents]) => ({
      category,
      color: categoryColor(type, category),
      cents,
      share: total > 0 ? cents / total : 0,
    }))
    .sort((a, b) => b.cents - a.cents);
}

export type CategoryComparison = { category: string; color: string; aCents: number; bCents: number };

/** Ausgaben je Kategorie in zwei Monaten nebeneinander, sortiert nach Monat A. */
export function compareCategories(a: Entry[], b: Entry[]): CategoryComparison[] {
  const rows = new Map<string, CategoryComparison>();
  const row = (category: string) => {
    let r = rows.get(category);
    if (!r) {
      r = { category, color: categoryColor('expense', category), aCents: 0, bCents: 0 };
      rows.set(category, r);
    }
    return r;
  };
  for (const e of a) if (e.type === 'expense') row(e.category).aCents += e.amountCents;
  for (const e of b) if (e.type === 'expense') row(e.category).bCents += e.amountCents;
  return [...rows.values()].sort((x, y) => y.aCents - x.aCents || y.bCents - x.bCents);
}

/** Gruppiert (bereits sortierte) Buchungen nach Datum für eine SectionList. */
export function groupByDate<T extends { date: string }>(items: T[]): { date: string; data: T[] }[] {
  const groups: { date: string; data: T[] }[] = [];
  for (const t of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.data.push(t);
    else groups.push({ date: t.date, data: [t] });
  }
  return groups;
}

export function matchesSearch(t: Transaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
