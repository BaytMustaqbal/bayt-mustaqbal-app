import { test } from 'node:test';
import { strictEqual } from 'node:assert';

import { nextBurstState } from '../wa-bot/src/index.js';

test('nextBurstState: pertama dibilang dalam ambang', () => {
  const r = nextBurstState(null, 100, 6);
  strictEqual(r.allowed, true);
  strictEqual(r.rejected, false);
  strictEqual(r.next.count, 1);
});

test('nextBurstState: ganti bucket mereset hitungan', () => {
  const r = nextBurstState({ bucket: 99, count: 6 }, 100, 6);
  strictEqual(r.allowed, true);
  strictEqual(r.next.count, 1);
});

test('nextBurstState: melewati ambang ditolak', () => {
  const r = nextBurstState({ bucket: 100, count: 6 }, 100, 6);
  strictEqual(r.allowed, false);
  strictEqual(r.rejected, true);
  strictEqual(r.next.count, 7);
});

test('nextBurstState: tepat di ambang masih dibilang', () => {
  const r = nextBurstState({ bucket: 100, count: 5 }, 100, 6);
  strictEqual(r.allowed, true);
  strictEqual(r.next.count, 6);
});
