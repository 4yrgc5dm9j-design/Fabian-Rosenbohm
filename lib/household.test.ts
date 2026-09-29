/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createHousehold,
  exportCode,
  mergeHouseholds,
  migrateV1,
  parseExportCode,
  toCsv,
} from './household.ts';

test('Migration aus Version 1 ordnet Buchungen der ersten Person zu', () => {
  const data = migrateV1([
    { id: 'x', type: 'expense', amountCents: 500, category: 'Lebensmittel', note: '', date: '2026-09-01', createdAt: 1 },
  ]);
  assert.equal(data.transactions[0].paidBy, data.members[0].id);
  assert.ok(data.shops.some((s) => s.name === 'Lidl'));
});

test('Zwei Haushalte zusammenführen', () => {
  const mine = createHousehold('Fabian');
  const theirs = createHousehold('Anna');
  mine.transactions.push({ id: 't1', type: 'expense', amountCents: 100, category: 'Sonstiges', note: '', date: '2026-09-01', createdAt: 1, updatedAt: 1, paidBy: mine.members[0].id });
  theirs.transactions.push({ id: 't1', type: 'expense', amountCents: 999, category: 'Sonstiges', note: '', date: '2026-09-01', createdAt: 1, updatedAt: 5, paidBy: mine.members[0].id });
  theirs.transactions.push({ id: 't2', type: 'income', amountCents: 200, category: 'Gehalt', note: '', date: '2026-09-02', createdAt: 2, paidBy: theirs.members[0].id });
  theirs.shops.push({ id: 'z', name: 'Netto', category: 'Lebensmittel' });

  const merged = mergeHouseholds(mine, parseExportCode(exportCode(theirs)));
  assert.deepEqual(merged.members.map((m) => m.name), ['Fabian', 'Anna']);
  assert.notEqual(merged.members[0].color, merged.members[1].color);
  assert.equal(merged.transactions.length, 2);
  assert.equal(merged.transactions.find((t) => t.id === 't1')?.amountCents, 999); // neuere Version gewinnt
  assert.equal(merged.shops.filter((s) => s.name === 'Lidl').length, 1);
  assert.ok(merged.shops.some((s) => s.name === 'Netto'));
});

test('Ungültige Codes werden verständlich abgelehnt', () => {
  assert.throws(() => parseExportCode('hallo'), /kein Haushaltsbuch-Code/);
  assert.throws(() => parseExportCode('HAUSHALTSBUCH:{'), /unvollständig/);
});

test('CSV-Export', () => {
  const data = createHousehold('Fabian');
  data.transactions.push({ id: 't', type: 'expense', amountCents: 1250, category: 'Lebensmittel', note: 'Lidl; groß', date: '2026-09-01', createdAt: 1, paidBy: data.members[0].id });
  const [header, row] = toCsv(data).split('\n');
  assert.ok(header.startsWith('Datum;Typ;Betrag'));
  assert.equal(row, '2026-09-01;Ausgabe;12,50;Lebensmittel;"Lidl; groß";Fabian;');
});
