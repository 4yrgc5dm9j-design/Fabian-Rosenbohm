/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  altersentlastung,
  calculateNetto,
  DEFAULT_NETTO_INPUT,
  incomeTax2026,
  pvRateEmployee,
  type NettoInput,
} from './netto.ts';

const calc = (patch: Partial<NettoInput>) => calculateNetto({ ...DEFAULT_NETTO_INPUT, ...patch });

test('Einkommensteuertarif 2026 an den Zonengrenzen', () => {
  assert.equal(incomeTax2026(12348), 0);
  assert.equal(incomeTax2026(12349), 0);
  assert.equal(incomeTax2026(17799), 1034); // Übergang Zone 2 → 3
  assert.equal(incomeTax2026(69878), 18213);
  assert.equal(incomeTax2026(100000), 30864);
  assert.equal(incomeTax2026(300000), 115529);
});

test('4.000 € brutto, Steuerklasse I, kinderlos, NRW', () => {
  const r = calc({ grossMonthly: 4000 });
  assert.equal(r.kind, 'regular');
  assert.equal(r.rv, 372);
  assert.equal(r.av, 52);
  assert.equal(r.kv, 350);
  assert.equal(r.pv, 96); // 1,8 % + 0,6 % Kinderlosenzuschlag
  assert.equal(r.details.vorsorgepauschale, 9672);
  assert.equal(r.details.zve, 37062);
  assert.equal(r.lohnsteuer, 524.5);
  assert.equal(r.soli, 0);
  assert.equal(r.net, 2605.5);
});

test('Steuerklassen im Vergleich', () => {
  const lst = ([1, 3, 5, 6] as const).map((taxClass) => calc({ grossMonthly: 4000, taxClass }).lohnsteuer);
  assert.deepEqual(lst, [524.5, 201.83, 944.91, 989.25]);
});

test('Kirchensteuer: 8 % in Bayern, 9 % sonst; Kinderfreibetrag senkt sie', () => {
  const by = calc({ grossMonthly: 4000, church: true, state: 'BY' });
  const nw = calc({ grossMonthly: 4000, church: true, state: 'NW' });
  assert.equal(by.kirchensteuer, Math.floor(6294 * 0.08 * 100 / 12) / 100);
  assert.equal(nw.kirchensteuer, Math.floor(6294 * 0.09 * 100 / 12) / 100);
  const withChild = calc({ grossMonthly: 4000, church: true, state: 'BY', childAllowances: 1, children: 1 });
  assert.ok(withChild.kirchensteuer < by.kirchensteuer);
});

test('Soli erst oberhalb der Freigrenze', () => {
  assert.equal(calc({ grossMonthly: 6000 }).soli, 0);
  assert.ok(calc({ grossMonthly: 9000 }).soli > 0);
});

test('Pflegeversicherung: Sachsen, Kinderlosenzuschlag, Abschläge', () => {
  assert.equal(pvRateEmployee({ ...DEFAULT_NETTO_INPUT, children: 0 }), 0.024);
  assert.equal(pvRateEmployee({ ...DEFAULT_NETTO_INPUT, children: 1 }), 0.018);
  assert.equal(pvRateEmployee({ ...DEFAULT_NETTO_INPUT, children: 1, state: 'SN' }), 0.023);
  assert.equal(pvRateEmployee({ ...DEFAULT_NETTO_INPUT, children: 3, childrenUnder25: 3 }), 0.013);
  assert.equal(pvRateEmployee({ ...DEFAULT_NETTO_INPUT, birthYear: 2005 }), 0.018); // unter 23
});

test('Altersentlastungsbetrag nach Jahrgang', () => {
  assert.equal(altersentlastung(1961, 60000), 608); // 64 geworden 2025 → 12,8 %, max. 608 €
  assert.equal(altersentlastung(1962, 60000), 0);
  assert.equal(altersentlastung(1961, 3000), 384);
});

test('Minijob und Midijob', () => {
  const mini = calc({ grossMonthly: 550 });
  assert.equal(mini.kind, 'minijob');
  assert.equal(mini.lohnsteuer, 0);
  assert.equal(mini.rv, 19.8);
  assert.equal(calc({ grossMonthly: 550, rvPflichtig: false }).net, 550);

  const midi = calc({ grossMonthly: 1200 });
  assert.equal(midi.kind, 'midijob');
  // Reduzierte Bemessungsgrundlage: 2000 / 1397 × (1200 − 603) ≈ 854,69 €
  assert.equal(midi.rv, 79.49);
});

test('Beitragsbemessungsgrenzen deckeln die Sozialabgaben', () => {
  const r = calc({ grossMonthly: 12000 });
  assert.equal(r.rv, 785.85); // 8.450 × 9,3 %
  assert.equal(r.kv, 508.59); // 5.812,50 × 8,75 %
});
