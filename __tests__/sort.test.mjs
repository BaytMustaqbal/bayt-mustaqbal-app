import { test } from 'node:test';
import { strictEqual, deepEqual } from 'node:assert';

import { urutTransaksiTerbaru, waktuTransaksi } from '../utils/sort.js';

test('waktuTransaksi: prefere created_at, lalu createdAt, lalu ts, else empty', () => {
  strictEqual(waktuTransaksi({ created_at: '2026-11-17T10:00:00Z' }), '2026-11-17T10:00:00Z');
  strictEqual(waktuTransaksi({ createdAt: '2026-11-17T09:00:00Z' }), '2026-11-17T09:00:00Z');
  strictEqual(waktuTransaksi({ ts: 'ts-val' }), 'ts-val');
  strictEqual(waktuTransaksi({}), '');
  strictEqual(waktuTransaksi(null), '');
});

test('urutTransaksiTerbaru: tanggal terbaru dulu', () => {
  const a = { id: 'a', date: '2026-11-17', created_at: 'x' };
  const b = { id: 'b', date: '2026-11-16', created_at: 'x' };
  deepEqual(urutTransaksiTerbaru([b, a]).map((x) => x.id), ['a', 'b']);
});

test('urutTransaksiTerbaru: tanggal sama → created_at terbaru dulu', () => {
  const a = { id: 'a', date: '2026-11-17', created_at: '2026-11-17T12:00:00Z' };
  const b = { id: 'b', date: '2026-11-17', created_at: '2026-11-17T10:00:00Z' };
  deepEqual(urutTransaksiTerbaru([b, a]).map((x) => x.id), ['a', 'b']);
});

test('urutTransaksiTerbaru: draft offline pakai createdAt', () => {
  const a = { id: 'a', date: '2026-11-17', createdAt: '2026-11-17T12:00:00Z' };
  const b = { id: 'b', date: '2026-11-17', createdAt: '2026-11-17T10:00:00Z' };
  deepEqual(urutTransaksiTerbaru([b, a]).map((x) => x.id), ['a', 'b']);
});

test('urutTransaksiTerbaru: tidak mutate input', () => {
  const list = [{ id: 'b', date: '2026-11-16' }, { id: 'a', date: '2026-11-17' }];
  const out = urutTransaksiTerbaru(list);
  strictEqual(list.length, 2);
  strictEqual(list[0].id, 'b');
  strictEqual(out[0].id, 'a');
});

test('urutTransaksiTerbaru: input kosong/non-array -> []', () => {
  deepEqual(urutTransaksiTerbaru([]), []);
  deepEqual(urutTransaksiTerbaru(), []);
  deepEqual(urutTransaksiTerbaru(null), []);
});
