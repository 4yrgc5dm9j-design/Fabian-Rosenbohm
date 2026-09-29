// Reine Logik des Haushaltsbuchs – ohne React/React Native, damit sie
// direkt mit `node --test` getestet werden kann.

export type TransactionType = 'expense' | 'income';

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
};

export type Category = { name: string; color: string };

export const EXPENSE_CATEGORIES: Category[] = [
  { name: 'Lebensmittel', color: '#2E9E6B' },
  { name: 'Wohnen', color: '#3B6FD8' },
  { name: 'Mobilität', color: '#D98A1E' },
  { name: 'Freizeit', color: '#B8499E' },
  { name: 'Gesundheit', color: '#D84B4B' },
  { name: 'Kleidung', color: '#7A5CD6' },
  { name: 'Verträge', color: '#1E98B0' },
  { name: 'Sonstiges', color: '#7C8591' },
];

export const INCOME_CATEGORIES: Category[] = [
  { name: 'Gehalt', color: '#2E9E6B' },
  { name: 'Nebenjob', color: '#3B6FD8' },
  { name: 'Geschenk', color: '#B8499E' },
  { name: 'Sonstiges', color: '#7C8591' },
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

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function inMonth(transactions: Transaction[], key: string): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === key);
}

/** Neueste zuerst; bei gleichem Datum zuletzt erfasste zuerst. */
export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
}

export type Summary = { incomeCents: number; expenseCents: number; balanceCents: number };

export function summarize(transactions: Transaction[]): Summary {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const t of transactions) {
    if (t.type === 'income') incomeCents += t.amountCents;
    else expenseCents += t.amountCents;
  }
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

export type CategoryTotal = { category: string; color: string; cents: number; share: number };

/** Summen je Kategorie für einen Typ, absteigend sortiert, mit Anteil (0–1). */
export function totalsByCategory(
  transactions: Transaction[],
  type: TransactionType,
): CategoryTotal[] {
  const sums = new Map<string, number>();
  let total = 0;
  for (const t of transactions) {
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

/** Gruppiert (bereits sortierte) Buchungen nach Datum für eine SectionList. */
export function groupByDate(transactions: Transaction[]): { date: string; data: Transaction[] }[] {
  const groups: { date: string; data: Transaction[] }[] = [];
  for (const t of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.data.push(t);
    else groups.push({ date: t.date, data: [t] });
  }
  return groups;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
