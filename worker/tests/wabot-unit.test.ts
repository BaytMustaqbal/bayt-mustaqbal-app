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
  formatBills,
  formatGoals,
  formatCategoryDetail,
  formatReminders,
  formatReminderSaved,
  parseReminder,
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
assert('neuro → menu', parseIntent('neuro') === 'menu', parseIntent('neuro'));
assert('Neuro (kapital) → menu', parseIntent('Neuro') === 'menu', parseIntent('Neuro'));
assert('neuro rangkuman → 1', parseIntent('neuro rangkuman') === '1', parseIntent('neuro rangkuman'));
assert('Neuro saldo → 2', parseIntent('Neuro saldo') === '2', parseIntent('Neuro saldo'));
assert('neuro agenda → 3', parseIntent('neuro agenda') === '3', parseIntent('neuro agenda'));
assert('neuro: menu → menu', parseIntent('neuro: menu') === 'menu', parseIntent('neuro: menu'));
assert('halo neuro → menu', parseIntent('halo neuro') === 'menu', parseIntent('halo neuro'));
assert('tolong neuro buatkan rangkuman → 1', parseIntent('tolong neuro buatkan rangkuman') === '1', parseIntent('tolong neuro buatkan rangkuman'));
assert('buatkan rangkuman neuro → 1', parseIntent('buatkan rangkuman neuro') === '1', parseIntent('buatkan rangkuman neuro'));
assert('apa kabar neuro → null', parseIntent('apa kabar neuro') === null, parseIntent('apa kabar neuro'));
assert('neurobion → null (bukan wake word)', parseIntent('neurobion') === null, parseIntent('neurobion'));
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
const summary = formatSummary(
  [
    { label: 'Belanja', total: 850000 },
    { label: 'Transportasi', total: 200000 },
  ],
  '*Rangkuman Pengeluaran*'
);
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

// === parseIntent ekstensi ===
console.log('\n=== parseIntent ekstensi ===');
assert('tagihan → 4', parseIntent('tagihan belum lunas') === '4', parseIntent('tagihan belum lunas'));
assert('tabungan → 5', parseIntent('progres tabungan') === '5', parseIntent('progres tabungan'));
assert('minggu lalu → 6', parseIntent('rangkuman minggu lalu') === '6', parseIntent('rangkuman minggu lalu'));
assert('rekap rinci → 7', parseIntent('rekap rinci per kategori') === '7', parseIntent('rekap rinci per kategori'));
assert('ingatkan → 8', parseIntent('ingatkan aku besok jam 9 beli beras') === '8', parseIntent('ingatkan aku besok jam 9 beli beras'));

// === formatBills ===
console.log('\n=== formatBills ===');
const bills = formatBills([
  { name: 'Listrik', amount: 300000, due_date: '2026-11-15' },
  { name: 'Internet', amount: 200000, due_date: '2026-11-18' },
]);
assert('bills memuat nama', bills.includes('Listrik') && bills.includes('Internet'), bills);
assert('bills total benar', bills.includes('Rp 500.000'), bills);
assert('bills kosong memberi pesan', formatBills([]).includes('tidak ada tagihan'), formatBills([]));

// === formatGoals ===
console.log('\n=== formatGoals ===');
const goals = formatGoals([{ nama: 'Mobil', target: 50000000, current: 15000000, achieved: 0 }]);
assert('goals memuat persen', goals.includes('30%'), goals);
assert('goals memuat sisa', goals.includes('Rp 35.000.000'), goals);

// === formatCategoryDetail ===
console.log('\n=== formatCategoryDetail ===');
const catDetail = formatCategoryDetail([{ label: 'Belanja', total: 400000, count: 3 }]);
assert('detail memuat jumlah', catDetail.includes('3x'), catDetail);
assert('detail memuat total', catDetail.includes('Rp 400.000'), catDetail);

// === formatReminders / formatReminderSaved ===
console.log('\n=== formatReminders ===');
const rem = formatReminders([{ message: 'bayar cicilan', remind_at: '2026-11-14T02:00:00.000Z' }]);
assert('reminder memuat pesan', rem.includes('bayar cicilan'), rem);
assert('reminder kosong memberi pesan', formatReminders([]).includes('Tidak ada pengingat'), formatReminders([]));
assert('reminder saved konfirmasi', formatReminderSaved('"x"').includes('Pengingat disimpan'), formatReminderSaved('"x"'));

// === parseReminder ===
console.log('\n=== parseReminder ===');
const r1 = parseReminder('besok jam 9 bayar cicilan');
assert('reminder besok jam 9', r1?.dayOffset === 1 && r1?.hour === 9 && r1?.message === 'bayar cicilan', r1);
const r2 = parseReminder('sore ini beli beras');
assert('reminder sore ini', r2?.dayOffset === 0 && r2?.hour === 17 && r2?.message === 'beli beras', r2);
assert('reminder tanpa pesan → null', parseReminder('besok jam 9') === null, parseReminder('besok jam 9'));

// === SUMMARY ===
console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount} / ${passCount + failCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  console.log('Failures:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
