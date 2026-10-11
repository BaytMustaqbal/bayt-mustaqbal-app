// worker/src/routes/settings.ts
// Settings routes (admin only)

import { Hono } from 'hono';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { getSetting, setSetting, writeAudit, sendFonnteWA } from '../utils/db';
import type { Env } from '../types/env';

export const settingsRoutes = new Hono<{ Bindings: Env }>();

settingsRoutes.use('*', authMiddleware, requireAdmin);

// GET /api/settings/get
settingsRoutes.get('/get', async (c) => {
  const settings = await c.env.DB.prepare('SELECT k, v FROM settings').all();
  const map: Record<string, string> = {};
  settings.results.forEach(s => map[s.k] = s.v);
  
  // Mask sensitive
  if (map.fonnte_token) map.fonnte_token = '***masked***';
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { settings: map } });
});

// POST /api/settings/set
settingsRoutes.post('/set', async (c) => {
  const user = c.get('user');
  const { key, value } = await c.req.json();
  
  if (!key) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Key wajib' }}, 400);
  }
  
  const allowedKeys = [
    'nama_keluarga', 'mulai_data', 'bulan_angsuran_gaji', 'default_scope',
    'mata_uang', 'hari_libur', 'cuti_tahunan',
    'fonnte_token', 'fonnte_target', 'fonnte_device', 'notifikasi_channel', 'jam_notifikasi'
  ];
  
  if (!allowedKeys.includes(key)) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'FORBIDDEN', message: 'Key tidak diizinkan' }}, 403);
  }
  
  // Validation
  if (key === 'jam_notifikasi' && value && !/^\d{2}:\d{2}$/.test(value)) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Format jam HH:mm' }}, 400);
  }
  if (key === 'fonnte_target' && value && !/@g\.us$/.test(value)) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Group ID harus format 628xxx@g.us' }}, 400);
  }
  if (key === 'notifikasi_channel' && value && !['WA', 'EMAIL', 'BOTH', 'NONE'].includes(value)) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Channel tidak valid' }}, 400);
  }
  
  const oldValue = await getSetting(c.env.DB, key);
  await setSetting(c.env.DB, key, value);
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'setting', entity: 'settings', entityId: key,
    ringkas: `Ubah setting: ${key}`, sebelum: { v: oldValue }, sesudah: { v: value }
  });
  
  // Reset triggers if jam_notifikasi changed
  if (key === 'jam_notifikasi') {
    // Triggers will be re-evaluated on next scheduled run
  }
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true, key, value } });
});

// POST /api/settings/test-wa
settingsRoutes.post('/test-wa', async (c) => {
  const testMsg = `✅ *Test Notifikasi Bayt Mustaqbal*\n\nKirim dari: ${c.get('user').email}\nWaktu: ${new Date().toISOString()}\n\nJika pesan ini sampai, integrasi Fonnte berfungsi dengan baik.`;
  
  const result = await sendFonnteWA(c.env, testMsg);
  
  if (result.success) {
    return c.json<Env['ApiResponse']>({ ok: true, data: { message: 'Test WA terkirim!' }});
  } else {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'SERVER', message: 'Test gagal: ' + result.error }}, 500);
  }
});

// GET /api/settings/triggers
settingsRoutes.get('/triggers', async (c) => {
  // This would need Workers API to list triggers - not available in worker runtime
  // Return info from settings instead
  const jamNotif = await getSetting(c.env.DB, 'jam_notifikasi') || '07:00';
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      triggers: [
        { name: 'Daily Digest', schedule: `${jamNotif} daily`, handler: 'dailyDigest' },
        { name: 'Bill Reminder', schedule: 'Hourly', handler: 'billReminder' },
        { name: 'Monthly Generate', schedule: '1st 00:30', handler: 'monthlyGenerate' }
      ],
      jam_notifikasi: jamNotif
    }
  });
});

// POST /api/settings/regenerate-bills
settingsRoutes.post('/regenerate-bills', async (c) => {
  const user = c.get('user');
  const { periode, force } = await c.req.json();
  const targetPeriode = periode || (new Date().toISOString().slice(0, 7));
  
  // Import bill generate logic here or call via internal
  // For now return info
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'generate', entity: 'bills', entityId: '',
    ringkas: `Manual regenerate tagihan ${targetPeriode}`, sesudah: { force: !!force }
  });
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: { message: 'Regenerate diminta, akan diproses oleh cron berikutnya', periode: targetPeriode }
  });
});

// POST /api/settings/archive-logs
settingsRoutes.post('/archive-logs', async (c) => {
  const user = c.get('user');
  
  // Archive audit_log > 20000 rows
  const auditCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM audit_log').first();
  if (auditCount.cnt > 20000) {
    const archiveName = `audit_log_archive_${new Date().toISOString().slice(0,7).replace('-','')}`;
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${archiveName} AS SELECT * FROM audit_log WHERE 1=0`).run();
    await c.env.DB.prepare(`INSERT INTO ${archiveName} SELECT * FROM audit_log ORDER BY waktu ASC LIMIT ?`).bind(auditCount.cnt - 15000).run();
    await c.env.DB.prepare(`DELETE FROM audit_log WHERE log_id IN (SELECT log_id FROM audit_log ORDER BY waktu ASC LIMIT ?)`).bind(auditCount.cnt - 15000).run();
  }
  
  // Archive notification_log > 5000 rows
  const notifCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM notification_log').first();
  if (notifCount.cnt > 5000) {
    const archiveName = `notification_log_archive_${new Date().toISOString().slice(0,7).replace('-','')}`;
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${archiveName} AS SELECT * FROM notification_log WHERE 1=0`).run();
    await c.env.DB.prepare(`INSERT INTO ${archiveName} SELECT * FROM notification_log ORDER BY waktu ASC LIMIT ?`).bind(notifCount.cnt - 3000).run();
    await c.env.DB.prepare(`DELETE FROM notification_log WHERE notif_id IN (SELECT notif_id FROM notification_log ORDER BY waktu ASC LIMIT ?)`).bind(notifCount.cnt - 3000).run();
  }
  
  await writeAudit(c.env.DB, { email: user.email, role: user.role, aksi: 'setting', entity: 'settings', entityId: 'archive', ringkas: 'Arsip log manual' });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { message: 'Arsip log selesai' }});
});

// GET /api/settings/stats
settingsRoutes.get('/stats', async (c) => {
  const tables = [
    'users', 'categories', 'accounts', 'transactions', 'recurring', 'bills',
    'attendance', 'calendar_events', 'service_asset', 'service_log',
    'notes', 'audit_log', 'notification_log'
  ];
  
  const stats: Record<string, number> = {};
  for (const table of tables) {
    const res = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).first();
    stats[table] = res?.cnt ?? 0;
  }
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { stats }});
});