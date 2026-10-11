// worker/src/cron.ts
// Cron job handlers for scheduled triggers

import type { Env } from './types/env';
import { sendFonnteWA } from './utils/auth';
import { getSetting, writeNotifLog, writeAudit } from './utils/db';

// ============================================================
//  Cron Handlers
// ============================================================
export async function handleDailyDigest(env: Env): Promise<void> {
  const channel = await getSetting(env.DB, 'notifikasi_channel') || 'WA';
  if (channel === 'NONE' || channel === 'EMAIL') return;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const currentPeriod = new Date().toISOString().slice(0, 7);
  
  // Get data
  const [bills, events, txns] = await Promise.all([
    env.DB.prepare('SELECT * FROM bills WHERE status = "belum"').all(),
    env.DB.prepare('SELECT * FROM calendar_events WHERE tanggal_mulai >= ?').bind(todayStr).all(),
    env.DB.prepare('SELECT * FROM transactions WHERE periode = ?').bind(currentPeriod).all()
  ]);
  
  const lateBills = bills.results.filter(b => b.jatuh_tempo < todayStr);
  const upcomingBills = bills.results.filter(b => b.jatuh_tempo >= todayStr && daysBetween(todayStr, b.jatuh_tempo) <= 7);
  
  const totalIncome = txns.results.filter(t => t.tipe === 'income').reduce((s, t) => s + t.jumlah, 0);
  const totalExpense = txns.results.filter(t => t.tipe === 'expense').reduce((s, t) => s + t.jumlah, 0);
  
  const familyName = await getSetting(env.DB, 'nama_keluarga') || 'Keluarga';
  
  let msg = `*${await getSetting(env.DB, 'nama_keluarga') || 'Keluarga'} — Ringkasan ${formatDate(todayStr)}*\n\n`;
  
  if (lateBills.length > 0) {
    msg += `🔴 *TAGIHAN TERLAMBAT (${lateBills.length})*\n`;
    lateBills.forEach(b => { msg += `• ${b.nama} — ${formatRupiah(b.jumlah)} (Tempo: ${formatDate(b.jatuh_tempo)})\n`; });
    msg += '\n';
  }
  
  if (upcomingBills.length > 0) {
    msg += `🟡 *TAGIHAN MINGGU INI (${upcomingBills.length})*\n`;
    upcomingBills.forEach(b => { msg += `• ${b.nama} — ${formatRupiah(b.jumlah)} (Tempo: ${formatDate(b.jatuh_tempo)})\n`; });
    msg += '\n';
  }
  
  if (events.results.length > 0) {
    msg += `📅 *AGENDA MENDATANG*\n`;
    events.results.slice(0, 5).forEach(e => { msg += `• ${formatDate(e.tanggal_mulai)} — ${e.judul}\n`; });
    msg += '\n';
  }
  
  msg += `💰 *KEUANGAN ${formatPeriod(currentPeriod).toUpperCase()}*\n`;
  msg += `Masuk: ${formatRupiah(totalIncome)}\n`;
  msg += `Keluar: ${formatRupiah(totalExpense)}\n`;
  msg += `Sisa: ${formatRupiah(totalIncome - totalExpense)}\n\n`;
  msg += `_Baytmustaqbal.my.id_`;
  
  const result = await sendFonnteWA({ 
    DB: env.DB, 
    FONNTE_TOKEN: env.FONNTE_TOKEN, 
    FONNTE_TARGET: env.FONNTE_TARGET, 
    FONNTE_DEVICE: env.FONNTE_DEVICE 
  }, msg);
  
  await writeNotifLog(env.DB, {
    tipe: 'daily_digest',
    periode: currentPeriod,
    penerima: env.FONNTE_TARGET,
    status: result.success ? 'terkirim' : 'gagal',
    pesan: msg,
    error: result.success ? '' : result.error
  });
}

export async function handleBillReminders(env: Env): Promise<void> {
  const channel = await getSetting(env.DB, 'notifikasi_channel') || 'WA';
  if (channel === 'NONE' || channel === 'EMAIL') return;
  
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  const pending = await env.DB.prepare(`
    SELECT * FROM bills 
    WHERE status = 'belum' AND remind_sent != 'YA' AND remind_at IS NOT NULL AND remind_at <= ?
  `).bind(nowStr).all();
  
  for (const bill of pending.results) {
    let msg = `⏰ *PENGINGAT TAGIHAN*\n\n`;
    msg += `📌 *${bill.nama}*\n`;
    msg += `💰 Jumlah: *${formatRupiah(bill.jumlah)}* ${bill.estimasi === 'YA' ? '(Estimasi)' : ''}\n`;
    msg += `📅 Jatuh Tempo: *${formatDate(bill.jatuh_tempo)}*\n`;
    if (bill.catatan) msg += `📝 Catatan: ${bill.catatan}\n`;
    msg += `\n_Silakan bayar melalui aplikasi Bayt Mustaqbal_`;
    
    try {
      const result = await sendFonnteWA({ 
        DB: env.DB, 
        FONNTE_TOKEN: env.FONNTE_TOKEN, 
        FONNTE_TARGET: env.FONNTE_TARGET, 
        FONNTE_DEVICE: env.FONNTE_DEVICE 
      }, msg);
      
      if (result.success) {
        await env.DB.prepare('UPDATE bills SET remind_sent = "YA" WHERE bill_id = ?').bind(bill.bill_id).run();
      }
      
      await writeNotifLog(env.DB, {
        tipe: 'bill_reminder',
        periode: bill.periode,
        penerima: env.FONNTE_TARGET,
        status: result.success ? 'terkirim' : 'gagal',
        pesan: msg,
        error: result.success ? '' : result.error
      });
      
      // Rate limit protection
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error('Reminder error:', err);
      await writeNotifLog(env.DB, {
        tipe: 'bill_reminder',
        periode: bill.periode,
        penerima: env.FONNTE_TARGET,
        status: 'gagal',
        pesan: msg,
        error: err instanceof Error ? err.message : 'Unknown'
      });
    }
  }
}

export async function handleMonthlyGenerate(env: Env): Promise<void> {
  const targetPeriode = new Date().toISOString().slice(0, 7);
  
  const recurrings = await env.DB.prepare(`
    SELECT * FROM recurring WHERE aktif = 'YA' AND auto_post = 'YA'
  `).all();
  
  let generated = 0, skipped = 0;
  
  for (const rec of recurrings.results) {
    if (!isRecurringDue(rec, targetPeriode)) { skipped++; continue; }
    
    const existing = await env.DB.prepare('SELECT 1 FROM bills WHERE rec_id = ? AND periode = ?').bind(rec.rec_id, targetPeriode).first();
    if (existing) { skipped++; continue; }
    
    const jatuhTempo = calculateDueDate(rec, targetPeriode);
    if (!jatuhTempo) { skipped++; continue; }
    
    let remindAt = '';
    if (rec.tipe === 'expense' && (rec.kategori_variabel === 'YA' || rec.nama.toLowerCase().includes('sampah'))) {
      remindAt = `${jatuhTempo} 08:00`;
    }
    
    await env.DB.prepare(`
      INSERT INTO bills (
        bill_id, nama, tipe, jumlah, jatuh_tempo, periode, rec_id, status, estimasi,
        prioritas, kategori_id, catatan, remind_at, remind_channel, remind_sent,
        void, dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'belum', ?, 'normal', ?, ?, ?, 'WA', 'TIDAK', 'TIDAK', ?, ?, ?, ?, 1)
    `).bind(
      crypto.randomUUID(), rec.nama, rec.tipe === 'income' ? 'rutin' : rec.tipe,
      Number(rec.jumlah) || 0, jatuhTempo, targetPeriode, rec.rec_id,
      rec.kategori_variabel === 'YA' ? 'YA' : 'TIDAK',
      rec.kategori_id, `Auto-generate: ${rec.nama}`, remindAt,
      'system', new Date().toISOString(), 'system', new Date().toISOString()
    ).run();
    
    generated++;
  }
  
  await writeAudit(env.DB, {
    email: 'system', role: 'admin', aksi: 'generate', entity: 'bills', entityId: '',
    ringkas: `Generate bulanan ${targetPeriode}`, sesudah: { generated, skipped }
  });
  
  console.log(`Monthly generate: ${generated} created, ${skipped} skipped`);
}

// ============================================================
//  Cron Exports for Worker
// ============================================================
export const cronHandlers = {
  '0 7 * * *': handleDailyDigest,
  '0 * * * *': handleBillReminders,
  '30 0 1 * *': handleMonthlyGenerate
};

// ============================================================
//  Helper Functions
// ============================================================
function daysBetween(d1: string, d2: string): number {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

function formatDate(d: string): string { 
  if (!d) return ''; 
  const dt = new Date(d); 
  return dt.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); 
}

function formatRupiah(n: number): string { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function formatPeriod(p: string): string { 
  const m = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; 
  const [y, mo] = p.split('-'); 
  return `${m[parseInt(mo)-1]} ${y}`; 
}

function isRecurringDue(rec: any, periode: string): boolean {
  const [y, m] = periode.split('-').map(Number);
  const start = new Date(rec.tanggal_mulai);
  const end = rec.tanggal_akhir ? new Date(rec.tanggal_akhir) : null;
  const ps = new Date(y, m - 1, 1);
  const pe = new Date(y, m, 0);
  if (start > pe) return false;
  if (end && end < ps) return false;
  return true;
}

function calculateDueDate(rec: any, periode: string): string | null {
  const [y, m] = periode.split('-').map(Number);
  switch (rec.frekuensi) {
    case 'bulanan': case 'tahunan':
      const day = Math.min(rec.hari_tanggal || 1, new Date(y, m, 0).getDate());
      return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    case 'mingguan': case 'harian':
      return `${y}-${String(m).padStart(2,'0')}-01`;
    default: return `${y}-${String(m).padStart(2,'0')}-01`;
  }
}