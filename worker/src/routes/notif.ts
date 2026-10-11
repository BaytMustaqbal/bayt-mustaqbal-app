// worker/src/routes/notif.ts
// Notifikasi routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { sendFonnteWA } from '../utils/auth';
import { getSetting, writeNotifLog } from '../utils/db';
import type { Env } from '../types/env';

export const notifRoutes = new Hono<{ Bindings: Env }>();

notifRoutes.use('*', authMiddleware);

// POST /api/notif/send
notifRoutes.post('/send', async (c) => {
  const { message, target } = await c.req.json();
  
  if (!message) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Pesan wajib diisi' }}, 400);
  }
  
  const result = await sendFonnteWA({ 
    DB: c.env.DB, 
    FONNTE_TOKEN: c.env.FONNTE_TOKEN, 
    FONNTE_TARGET: c.env.FONNTE_TARGET, 
    FONNTE_DEVICE: c.env.FONNTE_DEVICE 
  }, message, target);
  
  if (!result.success) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'SERVER', message: result.error }}, 500);
  }
  
  return c.json<Env['ApiResponse']>({ ok: true, data: result.data });
});

// POST /api/notif/daily_digest
notifRoutes.post('/daily_digest', async (c) => {
  const channel = await getSetting(c.env.DB, 'notifikasi_channel') || 'WA';
  if (channel === 'NONE' || channel === 'EMAIL') return c.json<Env['ApiResponse']>({ ok: true, data: { message: 'WA disabled' }});
  
  const today = new Date().toISOString().split('T')[0];
  const currentPeriod = new Date().toISOString().slice(0, 7);
  
  const [bills, events, txns] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM bills WHERE status = "belum"').all(),
    c.env.DB.prepare('SELECT * FROM calendar_events WHERE tanggal_mulai >= ?').bind(today).all(),
    c.env.DB.prepare('SELECT * FROM transactions WHERE periode = ?').bind(currentPeriod).all()
  ]);
  
  const lateBills = bills.results.filter(b => b.jatuh_tempo < today);
  const upcomingBills = bills.results.filter(b => b.jatuh_tempo >= today && daysBetween_(today, b.jatuh_tempo) <= 7);
  
  const totalIncome = sumBy_(txns.results.filter(t => t.tipe === 'income'), 'jumlah');
  const totalExpense = sumBy_(txns.results.filter(t => t.tipe === 'expense'), 'jumlah');
  
  const familyName = await getSetting(c.env.DB, 'nama_keluarga') || 'Keluarga';
  
  let msg = `*${familyName} — Ringkasan ${formatDate(today)}*\n\n`;
  
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
    DB: c.env.DB, 
    FONNTE_TOKEN: c.env.FONNTE_TOKEN, 
    FONNTE_TARGET: c.env.FONNTE_TARGET, 
    FONNTE_DEVICE: c.env.FONNTE_DEVICE 
  }, message);
  
  await writeNotifLog(c.env.DB, {
    tipe: 'daily_digest', periode: currentPeriod, penerima: c.env.FONNTE_TARGET,
    status: result.success ? 'terkirim' : 'gagal', pesan: message, error: result.success ? '' : result.error
  });
  
  return c.json<Env['ApiResponse']>({ ok: result.success, data: { message: message } });
});

// POST /api/notif/bill_reminder_check
notifRoutes.post('/bill_reminder_check', async (c) => {
  const channel = await getSetting(c.env.DB, 'notifikasi_channel') || 'WA';
  if (channel === 'NONE' || channel === 'EMAIL') return c.json<Env['ApiResponse']>({ ok: true, data: { message: 'WA disabled' }});
  
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  const pending = await c.env.DB.prepare(`
    SELECT * FROM bills 
    WHERE status = 'belum' AND remind_sent != 'YA' AND remind_at IS NOT NULL AND remind_at <= ?
  `).bind(nowStr).all();
  
  let sent = 0;
  for (const bill of pending.results) {
    let msg = `⏰ *PENGINGAT TAGIHAN*\n\n`;
    msg += `📌 *${bill.nama}*\n`;
    msg += `💰 Jumlah: *${formatRupiah(bill.jumlah)}* ${bill.estimasi === 'YA' ? '(Estimasi)' : ''}\n`;
    msg += `📅 Jatuh Tempo: *${formatDate(bill.jatuh_tempo)}*\n`;
    if (bill.catatan) msg += `📝 Catatan: ${bill.catatan}\n`;
    msg += `\n_Silakan bayar melalui aplikasi Bayt Mustaqbal_`;
    
    try {
      const result = await sendFonnteWA({ 
        DB: c.env.DB, 
        FONNTE_TOKEN: c.env.FONNTE_TOKEN, 
        FONNTE_TARGET: c.env.FONNTE_TARGET, 
        FONNTE_DEVICE: c.env.FONNTE_DEVICE 
      }, message);
      
      if (result.success) {
        await c.env.DB.prepare('UPDATE bills SET remind_sent = "YA" WHERE bill_id = ?').bind(bill.bill_id).run();
        sent++;
      }
      
      await writeNotifLog(c.env.DB, {
        tipe: 'bill_reminder', periode: bill.periode, penerima: c.env.FONNTE_TARGET,
        status: result.success ? 'terkirim' : 'gagal', pesan: message,
        error: result.success ? '' : result.error
      });
      
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error('Reminder error:', err);
    }
  }
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { checked: pending.results.length, sent } });
});

// POST /api/notif/test
notifRoutes.post('/test', async (c) => {
  const testMsg = `✅ *Test Notifikasi Bayt Mustaqbal*\n\nKirim dari: ${c.get('user').email}\nWaktu: ${new Date().toISOString()}\n\nJika pesan ini sampai, integrasi Fonnte berfungsi dengan baik.`;
  const result = await sendFonnteWA({ 
    DB: c.env.DB, 
    FONNTE_TOKEN: c.env.FONNTE_TOKEN, 
    FONNTE_TARGET: c.env.FONNTE_TARGET, 
    FONNTE_DEVICE: c.env.FONNTE_DEVICE 
  }, testMsg);
  
  return c.json<Env['ApiResponse']>({ ok: result.success, data: result.success ? { message: 'Test WA terkirim!' } : null, error: result.success ? null : { code: 'SERVER', message: result.error } });
});

// Helper functions
function sumBy_(arr: any[], key: string): number {
  return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}

function daysBetween_(d1: string, d2: string): number {
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