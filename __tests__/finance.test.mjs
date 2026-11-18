import { test } from 'node:test';
import { strictEqual, deepEqual } from 'node:assert';

import { computeMonthlyTrend, computeWeekly, computeCategories, budgetStatus } from '../utils/finance.js';

test('computeMonthlyTrend: 6 entri, mengagregasi per bulan', () => {
  const now = new Date();
  const key0 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const key1 = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const out = computeMonthlyTrend([
    { date: `${key0}-01`, amount: 100 },
    { date: `${key0}-15`, amount: 200 },
    { date: `${key1}-03`, amount: 50 },
  ]);
  strictEqual(out.length, 6);
  strictEqual(out[5].value, 300); // bulan terakhir = bulan ini
  strictEqual(out[4].value, 50);  // bulan sebelumnya
  strictEqual(out[0].value, 0);   // bulan ke-6 dari sekarang
});

test('computeMonthlyTrend: input kosong -> 6 nol', () => {
  const out = computeMonthlyTrend([]);
  strictEqual(out.length, 6);
  strictEqual(out.every((x) => x.value === 0), true);
  strictEqual(out.every((x) => typeof x.label === 'string'), true);
});

test('computeMonthlyTrend: item tanpa date/amount aman', () => {
  const out = computeMonthlyTrend([{ date: '', amount: 'x' }, null]);
  strictEqual(out.length, 6);
  strictEqual(out.every((x) => x.value === 0), true);
});

test('computeWeekly: 7 entri per hari minggu', () => {
  const out = computeWeekly([{ date: '2026-11-02', amount: 10 }]); // Senin
  strictEqual(out.length, 7);
  // Senin = index 1
  strictEqual(out[0].value, 10); // Senin = index 0 (mapping label 'Min' <- Senin)
  strictEqual(out[0].label, 'Min');
});

test('computeWeekly: input kosong -> semua 0', () => {
  const out = computeWeekly([]);
  strictEqual(out.length, 7);
  strictEqual(out.every((x) => x.value === 0), true);
});

test('computeCategories: agregat per kategori, sort desc', () => {
  const out = computeCategories(
    [
      { category: 'belanja', amount: 100 },
      { category: 'kuliner', amount: 50 },
      { category: 'belanja', amount: 25 },
      { category: 'unknown', amount: 10 },
    ],
    [
      { id: 'belanja', label: 'Belanja' },
      { id: 'kuliner', label: 'Kuliner' },
    ]
  );
  strictEqual(out.length, 3);
  strictEqual(out[0].label, 'Belanja');
  strictEqual(out[0].value, 125);
  strictEqual(out[1].label, 'Kuliner');
  strictEqual(out[1].value, 50);
  strictEqual(out[2].label, 'unknown'); // fallback label = cat id
  strictEqual(out[2].value, 10);
});

test('computeCategories: colorMap custom diterapkan', () => {
  const out = computeCategories(
    [{ category: 'x', amount: 10 }],
    [{ id: 'x', label: 'X' }],
    { x: 'rgb(1 2 3)' }
  );
  strictEqual(out[0].color, 'rgb(1 2 3)');
});

test('budgetStatus: aman/hati-hati/lewat/belum', () => {
  deepEqual(budgetStatus(40, 100), { level: 'aman', pct: 40, sisa: 60 });
  deepEqual(budgetStatus(85, 100), { level: 'hati-hati', pct: 85, sisa: 15 });
  deepEqual(budgetStatus(120, 100), { level: 'lewat', pct: 120, sisa: -20 });
  deepEqual(budgetStatus(0, 0), { level: 'belum', pct: 0, sisa: 0 });
  deepEqual(budgetStatus(50, null), { level: 'belum', pct: 0, sisa: 0 });
});
