/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { freeIncome, type Entry } from './budget.ts';
import { buildInsights } from './insights.ts';

const e = (p: Partial<Entry>): Entry => ({
  id: Math.random().toString(),
  type: 'expense',
  amountCents: 1000,
  category: 'Lebensmittel',
  note: '',
  date: '2026-08-10',
  createdAt: 0,
  paidBy: 'a',
  ...p,
});

test('Leerer Monat gibt einen Einstiegstipp', () => {
  const free = freeIncome([], '2026-08', '2026-09-29');
  const ins = buildInsights({ month: '2026-08', previousMonth: '2026-07', current: [], previous: [], free, dayOfMonth: null, daysInMonth: 31 });
  assert.equal(ins[0].id, 'empty');
});

test('Warnungen: hohe Fixkosten, Anstieg, häufige Einkäufe', () => {
  const current = [
    e({ type: 'income', amountCents: 200000, category: 'Gehalt', fixedId: 'g' }),
    e({ amountCents: 180000, category: 'Wohnen', fixedId: 'm' }),
    ...Array.from({ length: 9 }, () => e({ amountCents: 3000, note: 'Lidl' })),
  ];
  const previous = [e({ amountCents: 10000, date: '2026-07-10' })];
  const free = freeIncome(current, '2026-08', '2026-09-29');
  const ids = buildInsights({ month: '2026-08', previousMonth: '2026-07', current, previous, free, dayOfMonth: null, daysInMonth: 31 }).map((i) => i.id);
  assert.ok(ids.includes('fixed-share'));
  assert.ok(ids.includes('rise-Lebensmittel'));
  assert.ok(ids.includes('frequent'));
  assert.ok(ids.includes('over'));
});
