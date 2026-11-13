import { Env } from '../types/env';

/**
 * Logika murni WA bot (menu bernomor) — tanpa I/O, mudah diuji unit.
 *
 * Semua fungsi deterministik: input teks + data hasil query → output string
 * balasan. Routing + query dilakukan di route webhook, bukan di sini.
 */

/**
 * Normalisasi nomor WA ke bentuk internasional 62...
 * - "08123456789" -> "628123456789"
 * - "+628123456789" -> "628123456789"
 * - "628123456789" -> "628123456789"
 */
export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  else if (p.startsWith('62') && p.length > 2) p = '62' + p.slice(2);
  else if (!p.startsWith('62') && p.length > 0) p = '62' + p;
  return p;
}

/**
 * Cocokkan nomor pengirim ke user keluarga via kolom `phone`.
 * Nomor di DB bisa tersimpan sebagai 08xx maupun 628xx; karena itu
 * perbandingan dilakukan setelah normalisasi (8 vs 628 dianggap sama).
 * Mengembalikan user yang cocok, atau null.
 */
export async function findUserByPhone(env: Env, senderPhone: string) {
  const norm = normalizePhone(senderPhone);
  if (!norm) return null;
  const rows = await env.DB.prepare(
    `SELECT id, nama, group_id, group_role, username, phone FROM users
     WHERE void IS NULL AND phone IS NOT NULL AND phone != ''`
  ).all();
  const list = (rows.results || []) as { id: string; nama: string; group_id: string | null; group_role: string | null; username: string; phone: string }[];
  return list.find((r) => normalizePhone(r.phone) === norm) ?? null;
}

/** Teks menu utama. */
export function menuText(): string {
  return [
    'Halo! Saya Neuro, asisten keluarga Bayt Mustaqbal 🤖',
    '',
    'Panggil saya dengan "Neuro" lalu perintah, misal:',
    '  "Neuro rangkuman bulan ini"',
    '',
    'Atau pilih menu (balas angka):',
    '  1. Rangkuman pengeluaran bulan ini',
    '  2. Cek saldo bulan ini',
    '  3. Agenda hari ini',
    '',
    'Balas 1, 2, atau 3.',
  ].join('\n');
}

/** Parsing intent dari teks pesan. Kembalikan key menu atau null. */
export function parseIntent(text: string): 'menu' | '1' | '2' | '3' | null {
  let t = (text || '').trim().toLowerCase();
  if (!t) return null;

  // Wake word "neuro": buang semua kemunculan kata "neuro" yang berdiri sendiri
  // (bisa di awal, tengah, atau akhir). Lalu parse sisa. Kalau sisa kosong → menu.
  if (/\bneuro\b/.test(t)) {
    t = t.replace(/\bneuro\b/g, ' ').replace(/^[\s:,-]+/, '').replace(/\s+/g, ' ').trim();
    if (!t) return 'menu';
  }

  // Menu / bantuan / sapaan.
  if (['menu', 'bantuan', 'help', 'halo', 'hai', 'hi', 'assalamualaikum'].includes(t)) {
    return 'menu';
  }

  // Angka menu.
  if (/^1$/.test(t)) return '1';
  if (/^2$/.test(t)) return '2';
  if (/^3$/.test(t)) return '3';

  // Keyword langsung.
  if (/rangkuman|rekap|ringkasan/.test(t)) return '1';
  if (/saldo/.test(t)) return '2';
  if (/agenda|jadwal/.test(t)) return '3';

  return null;
}

/** Format Rupiah tanpa desimal. */
export function fmtRp(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

/** Rangkuman pengeluaran bulan ini. rows = [{ label, total }]. */
export function formatSummary(rows: { label: string; total: number }[]): string {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const lines = ['📊 *Rangkuman Pengeluaran*', ''];
  if (rows.length === 0) {
    lines.push('Belum ada pengeluaran bulan ini.');
  } else {
    for (const r of rows) {
      lines.push(`• ${r.label}: ${fmtRp(r.total)}`);
    }
  }
  lines.push('', `Total: ${fmtRp(total)}`);
  return lines.join('\n');
}

/** Balasan saldo bulan ini. */
export function formatSaldo(inMonth: number, outMonth: number): string {
  const sisa = inMonth - outMonth;
  return [
    '💰 *Saldo Bulan Ini*',
    '',
    `Pemasukan: ${fmtRp(inMonth)}`,
    `Pengeluaran: ${fmtRp(outMonth)}`,
    '',
    `Sisa: ${fmtRp(sisa)}`,
  ].join('\n');
}

/** Balasan agenda hari ini. rows = [{ time, title }]. */
export function formatAgenda(rows: { time: string | null; title: string }[], todayLabel: string): string {
  const lines = ['📅 *Agenda Hari Ini*', '', todayLabel, ''];
  if (rows.length === 0) {
    lines.push('Tidak ada agenda hari ini. 🎉');
  } else {
    for (const r of rows) {
      lines.push(`• ${r.time ? r.time.slice(0, 5) + ' ' : ''}${r.title}`);
    }
  }
  return lines.join('\n');
}
