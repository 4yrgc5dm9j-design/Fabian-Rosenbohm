/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  balances,
  centsToInput,
  entriesForMonth,
  entriesUntil,
  formatCents,
  freeIncome,
  simplifyDebts,
  splitEvenly,
  viewFor,
  type FixedItem,
  groupByDate,
  isValidDateString,
  parseAmount,
  shiftDate,
  shiftMonth,
  sortTransactions,
  summarize,
  totalsByCategory,
  type Transaction,
} from './budget.ts';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(),
    type: 'expense',
    amountCents: 100,
    category: 'Sonstiges',
    note: '',
    date: '2026-09-01',
    createdAt: 0,
    paidBy: 'a',
    ...partial,
  };
}

test('parseAmount versteht deutsche und einfache Eingaben', () => {
  assert.equal(parseAmount('12,50'), 1250);
  assert.equal(parseAmount('12.5'), 1250);
  assert.equal(parseAmount('7'), 700);
  assert.equal(parseAmount('1.234,56 €'), 123456);
  assert.equal(parseAmount('1.234'), 123400);
  assert.equal(parseAmount('0,1'), 10);
});

test('parseAmount lehnt ungültige Beträge ab', () => {
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('0'), null);
  assert.equal(parseAmount('-5'), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('1,234'), null);
});

test('formatCents zeigt kein negatives Null', () => {
  assert.equal(formatCents(-0).replace(/\s/g, ' '), '0,00 €');
  assert.equal(formatCents(-1250).replace(/\s/g, ' '), '-12,50 €');
});

test('centsToInput ergibt wieder parsebaren Text', () => {
  assert.equal(centsToInput(1250), '12,50');
  assert.equal(parseAmount(centsToInput(99999)), 99999);
});

test('Datums- und Monatshilfen', () => {
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.ok(isValidDateString('2024-02-29'));
  assert.ok(!isValidDateString('2026-02-30'));
  assert.ok(!isValidDateString('29.02.2024'));
});

test('summarize und totalsByCategory', () => {
  const list = [
    tx({ type: 'income', amountCents: 300000, category: 'Gehalt' }),
    tx({ amountCents: 30000, category: 'Lebensmittel' }),
    tx({ amountCents: 10000, category: 'Lebensmittel' }),
    tx({ amountCents: 60000, category: 'Wohnen' }),
  ];
  assert.deepEqual(summarize(list), {
    incomeCents: 300000,
    expenseCents: 100000,
    balanceCents: 200000,
  });
  const totals = totalsByCategory(list, 'expense');
  assert.deepEqual(
    totals.map((t) => [t.category, t.cents, t.share]),
    [
      ['Wohnen', 60000, 0.6],
      ['Lebensmittel', 40000, 0.4],
    ],
  );
});

test('sortTransactions und groupByDate', () => {
  const a = tx({ id: 'a', date: '2026-09-02', createdAt: 1 });
  const b = tx({ id: 'b', date: '2026-09-02', createdAt: 2 });
  const c = tx({ id: 'c', date: '2026-09-01', createdAt: 3 });
  const sorted = sortTransactions([c, a, b]);
  assert.deepEqual(sorted.map((t) => t.id), ['b', 'a', 'c']);
  assert.deepEqual(
    groupByDate(sorted).map((g) => [g.date, g.data.length]),
    [
      ['2026-09-02', 2],
      ['2026-09-01', 1],
    ],
  );
});

function fixed(partial: Partial<FixedItem>): FixedItem {
  return {
    id: 'f1',
    type: 'expense',
    amountCents: 90000,
    category: 'Wohnen',
    note: 'Miete',
    paidBy: 'a',
    startMonth: '2026-01',
    updatedAt: 0,
    ...partial,
  };
}

test('Fixposten erscheinen in ihren Monaten', () => {
  const f = fixed({ startMonth: '2026-03', endMonth: '2026-05' });
  assert.equal(entriesForMonth([], [f], '2026-02').length, 0);
  assert.equal(entriesForMonth([], [f], '2026-03')[0].date, '2026-03-01');
  assert.equal(entriesForMonth([], [f], '2026-06').length, 0);
  assert.equal(entriesUntil([], [f], '2026-12').length, 3);
});

test('Frei verfügbares Einkommen und Tagesbudget', () => {
  const entries = entriesForMonth(
    [tx({ amountCents: 20000, date: '2026-09-05' })],
    [fixed({}), fixed({ id: 'g', type: 'income', amountCents: 300000, category: 'Gehalt' })],
    '2026-09',
  );
  const free = freeIncome(entries, '2026-09', '2026-09-21', 10000);
  assert.equal(free.incomeCents, 300000);
  assert.equal(free.fixedExpenseCents, 90000);
  assert.equal(free.freeCents, 200000);
  assert.equal(free.remainingCents, 180000);
  assert.equal(free.daysLeft, 10);
  assert.equal(free.perDayCents, 18000);
  assert.equal(freeIncome(entries, '2026-09', '2026-10-01').daysLeft, null);
});

test('Aufteilen, Personenansicht und Ausgleich', () => {
  assert.deepEqual(splitEvenly(1001, ['a', 'b']), [
    { memberId: 'a', cents: 501 },
    { memberId: 'b', cents: 500 },
  ]);
  const shared = tx({ amountCents: 6000, paidBy: 'a', split: splitEvenly(6000, ['a', 'b']) });
  const own = tx({ amountCents: 1000, paidBy: 'b' });
  assert.deepEqual(viewFor([shared, own], 'b').map((e) => e.amountCents), [3000, 1000]);
  assert.equal(viewFor([shared, own], null).length, 2);

  const bal = balances([shared, own], [], ['a', 'b']);
  assert.deepEqual([...bal], [['a', 3000], ['b', -3000]]);
  assert.deepEqual(simplifyDebts(bal), [{ from: 'b', to: 'a', cents: 3000 }]);
  const settled = balances([shared], [{ id: 's', from: 'b', to: 'a', cents: 3000, date: '2026-09-02', createdAt: 0 }], ['a', 'b']);
  assert.deepEqual(simplifyDebts(settled), []);
});
