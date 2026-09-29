/// <reference types="node" />

import assert from 'node:assert/strict';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { test } from 'node:test';

import type { Member } from './budget.ts';
import { createCredentials, login, pbkdf2Sha256, sha256, toHex, utf8, validateAccount } from './auth.ts';

test('SHA-256 stimmt mit Node überein', () => {
  for (const s of ['', 'abc', 'ä'.repeat(100), 'x'.repeat(55), 'y'.repeat(64)]) {
    assert.equal(toHex(sha256(utf8(s))), createHash('sha256').update(s).digest('hex'));
  }
});

test('PBKDF2 stimmt mit Node überein', () => {
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const expected = pbkdf2Sync('geheim123', Buffer.from(salt), 1000, 32, 'sha256').toString('hex');
  assert.equal(toHex(pbkdf2Sha256(utf8('geheim123'), salt, 1000)), expected);
});

test('Anmelden mit richtigem und falschem Passwort', () => {
  const account = createCredentials(' Fabian ', 'geheim123', new Uint8Array(16).fill(7), 500);
  assert.equal(account.username, 'fabian');
  assert.ok(!JSON.stringify(account).includes('geheim123'));
  const members: Member[] = [
    { id: 'a', name: 'Fabian', color: '#000', account },
    { id: 'b', name: 'Anna', color: '#111' },
  ];
  assert.equal(login(members, 'FABIAN', 'geheim123')?.id, 'a');
  assert.equal(login(members, 'fabian', 'falsch'), null);
  assert.equal(login(members, 'anna', ''), null);
});

test('Prüfregeln für neue Konten', () => {
  const members: Member[] = [
    { id: 'a', name: 'Fabian', color: '#000', account: createCredentials('fabian', 'x'.repeat(6), new Uint8Array(16), 1) },
  ];
  assert.match(validateAccount('ab', 'geheim1', 'geheim1', members) ?? '', /3–30 Zeichen/);
  assert.match(validateAccount('fabian', 'geheim1', 'geheim1', members) ?? '', /schon vergeben/);
  assert.equal(validateAccount('fabian', 'geheim1', 'geheim1', members, 'a'), null);
  assert.match(validateAccount('anna', 'kurz', 'kurz', members) ?? '', /mindestens 6/);
  assert.match(validateAccount('anna', 'geheim1', 'geheim2', members) ?? '', /nicht überein/);
  assert.equal(validateAccount('anna', 'geheim1', 'geheim1', members), null);
});
