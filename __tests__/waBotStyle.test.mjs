import { test } from 'node:test';
import { strictEqual, deepEqual } from 'node:assert';

import { parseStyleCommand } from '../wa-bot/src/botPrefs.js';

test('parseStyleCommand: perintah valid', () => {
  strictEqual(parseStyleCommand('gaya hangat')?.value, 'hangat');
  strictEqual(parseStyleCommand('gaya bahasa profesional')?.value, 'profesional');
  strictEqual(parseStyleCommand('gaya bahasa saya jadi santai')?.value, 'santai');
  strictEqual(parseStyleCommand('ubah gaya jadi formal')?.value, 'formal');
  strictEqual(parseStyleCommand('gaya default')?.value, 'default');
  strictEqual(parseStyleCommand('gaya reset')?.value, 'default');
  strictEqual(parseStyleCommand('GAYA HANGAT')?.value, 'hangat');
});

test('parseStyleCommand: tanpa argumen → value null (tampilkan daftar)', () => {
  strictEqual(parseStyleCommand('gaya')?.value, null);
  strictEqual(parseStyleCommand('gaya bahasa')?.value, null);
  strictEqual(parseStyleCommand('gaya bahasa saya')?.value, null);
});

test('parseStyleCommand: kalimat biasa → null', () => {
  strictEqual(parseStyleCommand('gaya hidup sehat'), null);
  strictEqual(parseStyleCommand('halo apa kabar'), null);
  strictEqual(parseStyleCommand('gaya hidup'), null);
  strictEqual(parseStyleCommand('gaya bahasa aku: chill'), null);
});

test('parseStyleCommand: case-insensitive & trim', () => {
  strictEqual(parseStyleCommand('  gaya HANGAt  ')?.value, 'hangat');
  strictEqual(parseStyleCommand('Gaya Bahasa Formal')?.value, 'formal');
});

test('parseStyleCommand: input kosong/null → null', () => {
  strictEqual(parseStyleCommand(''), null);
  strictEqual(parseStyleCommand(null), null);
  strictEqual(parseStyleCommand(undefined), null);
});
