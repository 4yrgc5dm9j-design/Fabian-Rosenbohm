/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  centsToInput,
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
