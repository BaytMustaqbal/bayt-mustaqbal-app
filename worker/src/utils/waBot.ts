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

export type BotIntent =
  | 'menu'
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

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
    '  4. Tagihan belum lunas',
    '  5. Progres target tabungan',
    '  6. Rangkuman minggu lalu',
    '  7. Rekap rinci per kategori',
    '  8. Pengingat (cek / set)',
    '',
    'Balas angka 1-8, atau ketik perintah langsung.',
  ].join('\n');
}

/** Parsing intent dari teks pesan. Kembalikan key menu atau null. */
export function parseIntent(text: string): BotIntent | null {
  let t = (text || '').trim().toLowerCase();
  if (!t) return null;

  // Wake word "neuro": buang semua kemunculan kata "neuro" yang berdiri sendiri
  // (bisa di awal, tengah, atau akhir). Lalu parse sisa. Kalau sisa kosong → menu.
  if (/\bneuro\b/.test(t)) {
    t = t.replace(/\bneuro\b/g, ' ').replace(/^[\s:,-]+/, '').replace(/\s+/g, ' ').trim();
    if (!t) return 'menu';
  }

  if (['menu', 'bantuan', 'help', 'halo', 'hai', 'hi', 'assalamualaikum'].includes(t)) {
    return 'menu';
  }

  if (/^1$/.test(t)) return '1';
  if (/^2$/.test(t)) return '2';
  if (/^3$/.test(t)) return '3';
  if (/^4$/.test(t)) return '4';
  if (/^5$/.test(t)) return '5';
  if (/^6$/.test(t)) return '6';
  if (/^7$/.test(t)) return '7';
  if (/^8$/.test(t)) return '8';

  if (/tagihan|utang|belum lunas/.test(t)) return '4';
  if (/tabungan|target|impian/.test(t)) return '5';
  if (/minggu lalu|pekan lalu/.test(t)) return '6';
  if (/rekap rinci|rinci per kategori|per kategori/.test(t)) return '7';
  if (/ingatkan|pengingat|reminder|ingat/.test(t)) return '8';
  if (/rangkuman|rekap|ringkasan/.test(t)) return '1';
  if (/saldo/.test(t)) return '2';
  if (/agenda|jadwal/.test(t)) return '3';

  return null;
}

/** Format Rupiah tanpa desimal. */
export function fmtRp(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

/** Rangkuman pengeluaran suatu periode. rows = [{ label, total }]. */
export function formatSummary(rows: { label: string; total: number }[], title: string): string {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const lines = [`📊 ${title}`, ''];
  if (rows.length === 0) {
    lines.push('Tidak ada data pengeluaran pada periode ini.');
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

/** Balasan daftar tagihan belum lunas. rows = [{ name, amount, due_date }]. */
export function formatBills(rows: { name: string; amount: number; due_date: string }[]): string {
  const lines = ['🧾 *Tagihan Belum Lunas*', ''];
  if (rows.length === 0) {
    lines.push('Alhamdulillah, tidak ada tagihan yang belum lunas. 🎉');
  } else {
    const total = rows.reduce((s, r) => s + r.amount, 0);
    for (const r of rows) {
      lines.push(`• ${r.name}: ${fmtRp(r.amount)}`);
      lines.push(`  Jatuh tempo: ${r.due_date}`);
    }
    lines.push('', `Total: ${fmtRp(total)}`);
  }
  return lines.join('\n');
}

/** Balasan progres target tabungan. rows = [{ nama, target, current, achieved }]. */
export function formatGoals(rows: { nama: string; target: number; current: number; achieved: number }[]): string {
  const lines = ['🎯 *Target Tabungan*', ''];
  if (rows.length === 0) {
    lines.push('Tidak ada target tabungan aktif.');
  } else {
    for (const g of rows) {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      const sisa = Math.max(0, g.target - g.current);
      lines.push(`• ${g.nama}: ${fmtRp(g.current)} / ${fmtRp(g.target)} (${pct}%)`);
      if (!g.achieved) lines.push(`  Sisa: ${fmtRp(sisa)}`);
      else lines.push('  ✔ Tercapai');
    }
  }
  return lines.join('\n');
}

/** Balasan rekap rinci per kategori. rows = [{ label, total, count }]. */
export function formatCategoryDetail(rows: { label: string; total: number; count: number }[]): string {
  const lines = ['📂 *Rekap Rinci Per Kategori*', ''];
  if (rows.length === 0) {
    lines.push('Tidak ada data pengeluaran bulan ini.');
  } else {
    const total = rows.reduce((s, r) => s + r.total, 0);
    for (const r of rows) {
      lines.push(`• ${r.label}: ${fmtRp(r.total)} (${r.count}x)`);
    }
    lines.push('', `Total: ${fmtRp(total)}`);
  }
  return lines.join('\n');
}

/** Balasan daftar pengingat aktif. rows = [{ message, remind_at }]. */
export function formatReminders(rows: { message: string; remind_at: string }[]): string {
  const lines = ['⏰ *Pengingat Aktif*', ''];
  if (rows.length === 0) {
    lines.push('Tidak ada pengingat aktif.');
  } else {
    for (const r of rows) {
      lines.push(`• ${r.message}`);
      lines.push(`  ${r.remind_at}`);
    }
  }
  return lines.join('\n');
}

/** Balasan konfirmasi pengingat disimpan. */
export function formatReminderSaved(desc: string): string {
  return [`⏰ Pengingat disimpan: ${desc}`, 'Nanti saya ingatkan lewat WA.'].join('\n');
}

/** Balasan bantuan format pengingat. */
export function formatReminderHelp(): string {
  return [
    'Cara set pengingat:',
    '  "Neuro ingatkan aku besok jam 9 bayar cicilan"',
    '  "Neuro ingatkan aku sore ini beli beras"',
    '',
    'Kata waktu yang dikenali:',
    '  hari ini / besok, + pagi / siang / sore / malam, atau "jam HH:MM"',
  ].join('\n');
}

export interface ReminderSpec {
  dayOffset: number;      // 0 = hari ini, 1 = besok
  hour: number;
  minute: number;
  message: string;
}

const DAY_HOURS: Record<string, number> = { pagi: 6, siang: 12, sore: 17, malam: 20 };

/**
 * Parse teks pengingat. Kembalikan spec atau null bila tidak bisa dipahami.
 */
export function parseReminder(text: string): ReminderSpec | null {
  const t = (text || '').trim();
  if (!t) return null;

  let dayOffset = 0;
  let hour = 9;
  let minute = 0;

  if (/\bbesok\b/.test(t)) dayOffset = 1;

  // "jam HH:MM" atau "jam HH"
  const jamMatch = t.match(/\bjam\s+(\d{1,2})(?::(\d{2}))?/);
  if (jamMatch) {
    hour = parseInt(jamMatch[1], 10) % 24;
    minute = jamMatch[2] ? parseInt(jamMatch[2], 10) : 0;
  } else {
    // kata waktu
    const day = Object.keys(DAY_HOURS).find((k) => t.includes(k));
    if (day) hour = DAY_HOURS[day];
  }

  // Hapus keyword waktu dari pesan (termasuk frasa "sore ini", "hari ini").
  const message = t
    .replace(/\bingatkan aku\b/g, ' ')
    .replace(/\bingatkan\b/g, ' ')
    .replace(/\bbesok\b/g, ' ')
    .replace(/\bhari ini\b/g, ' ')
    .replace(/\b(pagi|siang|sore|malam)\s+ini\b/g, ' ')
    .replace(/\bini\s+(pagi|siang|sore|malam)\b/g, ' ')
    .replace(/\b(pagi|siang|sore|malam)\b/g, ' ')
    .replace(/\bjam\s+\d{1,2}(?::\d{2})?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!message) return null;
  return { dayOffset, hour, minute, message };
}
