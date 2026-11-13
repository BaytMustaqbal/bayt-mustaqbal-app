/**
 * Unit Test WA Bot (logika murni) — tanpa server & tanpa panggil Fonnte.
 *
 * Run:
 *   npx tsx tests/wabot-unit.test.ts
 */

import {
  normalizePhone,
  parseIntent,
  menuText,
  formatSummary,
  formatSaldo,
  formatAgenda,
} from '../src/utils/waBot';

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, actual: unknown) {
  if (condition) {
    passCount++;
    console.log(`  \u2713 ${name}`);
  } else {
    failCount++;
    failures.push(`${name} — got ${typeof actual === 'string' ? actual : JSON.stringify(actual)}`);
    console.log(`  \u2717 ${name} — got ${typeof actual === 'string' ? actual : JSON.stringify(actual)}`);
  }
}

// === normalizePhone ===
console.log('=== normalizePhone ===');
assert('08123456789 → 628123456789', normalizePhone('08123456789') === '628123456789', normalizePhone('08123456789'));
assert('+628123456789 → 628123456789', normalizePhone('+628123456789') === '628123456789', normalizePhone('+628123456789'));
assert('628123456789 → 628123456789', normalizePhone('628123456789') === '628123456789', normalizePhone('628123456789'));
assert('0812-3456-7890 → 6281234567890', normalizePhone('0812-3456-7890') === '6281234567890', normalizePhone('0812-3456-7890'));

// === parseIntent ===
console.log('\n=== parseIntent ===');
assert('menu → menu', parseIntent('menu') === 'menu', parseIntent('menu'));
assert('halo → menu', parseIntent('halo') === 'menu', parseIntent('halo'));
assert('"1" → 1', parseIntent('1') === '1', parseIntent('1'));
assert('"2" → 2', parseIntent('2') === '2', parseIntent('2'));
assert('"3" → 3', parseIntent('3') === '3', parseIntent('3'));
assert('rangkuman → 1', parseIntent('buat rangkuman pengeluaran bulan ini') === '1', parseIntent('buat rangkuman pengeluaran bulan ini'));
assert('saldo → 2', parseIntent('cek saldo') === '2', parseIntent('cek saldo'));
assert('agenda → 3', parseIntent('agenda besok') === '3', parseIntent('agenda besok'));
assert('teks acak → null', parseIntent('apa kabar hari ini') === null, parseIntent('apa kabar hari ini'));
assert('kosong → null', parseIntent('') === null, parseIntent(''));

// === formatSummary ===
console.log('\n=== formatSummary ===');
const summary = formatSummary([
  { label: 'Belanja', total: 850000 },
  { label: 'Transportasi', total: 200000 },
]);
assert('summary memuat kategori', summary.includes('Belanja') && summary.includes('Transportasi'), summary);
assert('summary total benar', summary.includes('Rp 1.050.000'), summary);
assert('summary pakai bintang markdown', summary.includes('*Rangkuman Pengeluaran*'), summary);

// === formatSaldo ===
console.log('\n=== formatSaldo ===');
const saldo = formatSaldo(3000000, 1050000);
assert('saldo pemasukan benar', saldo.includes('Rp 3.000.000'), saldo);
assert('saldo pengeluaran benar', saldo.includes('Rp 1.050.000'), saldo);
assert('saldo sisa benar', saldo.includes('Rp 1.950.000'), saldo);

// === formatAgenda ===
console.log('\n=== formatAgenda ===');
const agenda = formatAgenda(
  [
    { time: '08:00', title: 'Rapat RW' },
    { time: null, title: 'Kegiatan tanpa jam' },
  ],
  '2026-11-13'
);
assert('agenda memuat judul', agenda.includes('Rapat RW') && agenda.includes('Kegiatan tanpa jam'), agenda);
assert('agenda memuat jam', agenda.includes('08:00') && agenda.includes('08:00 Rapat RW'), agenda);
assert('agenda memuat tanggal', agenda.includes('2026-11-13'), agenda);
const agendaKosong = formatAgenda([], '2026-11-13');
assert('agenda kosong memberi pesan', agendaKosong.includes('Tidak ada agenda'), agendaKosong);

// === SUMMARY ===
console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount} / ${passCount + failCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  console.log('Failures:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
