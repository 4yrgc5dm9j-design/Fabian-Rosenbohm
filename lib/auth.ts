// Benutzerkonten: Passwort-Hashing (PBKDF2-HMAC-SHA256, reines JavaScript,
// damit es in Expo Go, im Browser und in `node --test` gleich funktioniert)
// sowie Prüfregeln für Benutzername und Passwort.

import type { Member } from './budget.ts';

export type Credentials = {
  username: string;
  /** Hex-kodierter Salt. */
  salt: string;
  /** Hex-kodierter PBKDF2-Hash. */
  hash: string;
  iterations: number;
};

export const PBKDF2_ITERATIONS = 10000;
export const MIN_PASSWORD_LENGTH = 6;

// ---------------------------------------------------------------------------
// SHA-256 / HMAC / PBKDF2

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(data: Uint8Array): Uint8Array {
  const bitLength = data.length * 8;
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15];
      const b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = new Uint8Array(64);
  block.set(key.length > 64 ? sha256(key) : key);
  const inner = block.map((x) => x ^ 0x36);
  const outer = block.map((x) => x ^ 0x5c);
  return sha256(concat(outer, sha256(concat(inner, message))));
}

/** PBKDF2-HMAC-SHA256 mit 32 Byte Ausgabe (ein Block). */
export function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number): Uint8Array {
  let u = hmacSha256(password, concat(salt, new Uint8Array([0, 0, 0, 1])));
  const result = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(password, u);
    for (let j = 0; j < 32; j++) result[j] ^= u[j];
  }
  return result;
}

export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s.normalize('NFC'));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Vergleich in konstanter Zeit, damit die Laufzeit nichts über den Hash verrät. */
function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Konten

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function createCredentials(
  username: string,
  password: string,
  saltBytes: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Credentials {
  return {
    username: normalizeUsername(username),
    salt: toHex(saltBytes),
    hash: toHex(pbkdf2Sha256(utf8(password), saltBytes, iterations)),
    iterations,
  };
}

export function verifyPassword(credentials: Credentials, password: string): boolean {
  const hash = toHex(pbkdf2Sha256(utf8(password), fromHex(credentials.salt), credentials.iterations));
  return equalHex(hash, credentials.hash);
}

/** Prüft Benutzername und Passwort; gibt eine Fehlermeldung oder `null` zurück. */
export function validateAccount(
  username: string,
  password: string,
  repeat: string,
  members: Member[],
  forMemberId?: string,
): string | null {
  const name = normalizeUsername(username);
  if (!/^[a-z0-9._-]{3,30}$/.test(name)) {
    return 'Der Benutzername braucht 3–30 Zeichen: Buchstaben (ohne Umlaute), Zahlen, Punkt, Minus oder Unterstrich.';
  }
  if (members.some((m) => m.account?.username === name && m.id !== forMemberId)) {
    return 'Dieser Benutzername ist schon vergeben.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (password !== repeat) return 'Die beiden Passwörter stimmen nicht überein.';
  return null;
}

/** Sucht das Konto zum Benutzernamen und prüft das Passwort. */
export function login(members: Member[], username: string, password: string): Member | null {
  const name = normalizeUsername(username);
  const member = members.find((m) => m.account?.username === name);
  if (!member?.account) return null;
  return verifyPassword(member.account, password) ? member : null;
}
