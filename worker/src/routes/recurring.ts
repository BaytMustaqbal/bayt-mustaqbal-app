// worker/src/routes/recurring.ts
// Recurring routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getCurrentPeriod, generateId, now, writeAudit } from '../utils/db';
import type { Env } from '../types/env';

export const recurringRoutes = new Hono<{ Bindings: Env }>();

recurringRoutes.use('*', authMiddleware);

// GET /api/recurring/list
recurringRoutes.get('/list', async (c) => {
  const user = c.get('user');
  const { tipe, aktif } = c.req.query();
  
  let where = 'WHERE r.void != "YA"';
  const params: any[] = [];
  
  if (tipe) { where += ' AND r.tipe = ?'; params.push(tipe); }
  if (aktif !== undefined) { where += ' AND r.aktif = ?'; params.push(aktif); }
  
  // User filter
  if (user.role !== 'admin') {
    where += ' AND r.dibuat_oleh = ?';
    params.push(user.email);
  }
  
  const { results } = await c.env.DB.prepare(`
    SELECT r.*, c.nama as kategori_nama, c.warna as kategori_warna, a.nama as account_nama
    FROM recurring r
    LEFT JOIN categories c ON r.kategori_id = c.category_id
    LEFT JOIN accounts a ON r.account_id = a.account_id
    ${where}
    ORDER BY r.nama
  `).bind(...params).all();
  
  const enriched = results.map(r => ({
    ...r,
    kategori_nama: r.kategori_nama || '',
    kategori_warna: r.kategori_warna || '#757575',
    account_nama: r.account_nama || '',
    frekuensi_label: r.frekuensi,
    formatted_jumlah: `Rp ${Number(r.jumlah).toLocaleString('id-ID')}`,
    next_due: calculateNextDue(r),
    next_due_label: calculateNextDue(r) ? new Date(calculateNextDue(r)!).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  }));
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { data: enriched } });
});

// POST /api/recurring/create
recurringRoutes.post('/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  const required = ['nama', 'tipe', 'kategori_id', 'frekuensi', 'tanggal_mulai'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: `${field} wajib diisi` }}, 400);
    }
  }
  
  const recId = generateId();
  const timestamp = now();
  
  await c.env.DB.prepare(`
    INSERT INTO recurring (
      rec_id, nama, tipe, kategori_id, jumlah, frekuensi, interval, tanggal_mulai, tanggal_akhir,
      hari_tanggal, scope, account_id, auto_post, kategori_variabel, aktif, void,
      dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'YA', 'TIDAK', ?, ?, ?, ?, 1)
  `).bind(
    recId, body.nama, body.tipe, body.kategori_id, Number(body.jumlah) || 0,
    body.frekuensi, Number(body.interval) || 1, body.tanggal_mulai, body.tanggal_akhir || '',
    Number(body.hari_tanggal) || 1, body.scope || 'keluarga', body.account_id || '',
    body.auto_post || 'TIDAK', body.kategori_variabel || 'TIDAK',
    user.email, timestamp, user.email, timestamp
  ).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'create', entity: 'recurring', entityId: recId,
    ringkas: `Buat recurring: ${body.nama}`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { rec_id: recId } });
});

// PUT /api/recurring/update
recurringRoutes.put('/update', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  if (!body.rec_id || !body.rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'rec_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM recurring WHERE rec_id = ?').bind(body.rec_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Recurring tidak ditemukan' }}, 404);
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  const allowed = ['nama', 'tipe', 'kategori_id', 'jumlah', 'frekuensi', 'interval', 'tanggal_mulai', 'tanggal_akhir', 'hari_tanggal', 'scope', 'account_id', 'auto_post', 'kategori_variabel', 'aktif'];
  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(field === 'jumlah' || field === 'interval' || field === 'hari_tanggal' ? Number(body[field]) : body[field]);
    }
  }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }}, 400);
  }
  
  updates.push('diubah_oleh = ?', 'diubah_pada = ?', 'rev = rev + 1');
  params.push(user.email, now(), body.rec_id, body.rev);
  
  await c.env.DB.prepare(`UPDATE recurring SET ${updates.join(', ')} WHERE rec_id = ? AND rev = ?`).bind(...params).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'update', entity: 'recurring', entityId: body.rec_id,
    ringkas: `Update recurring: ${body.nama || existing.nama}`, sebelum: existing, sesudah: body
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/recurring/delete
recurringRoutes.delete('/delete', async (c) => {
  const user = c.get('user');
  const { rec_id, rev } = c.req.query();
  
  if (!rec_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'rec_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM recurring WHERE rec_id = ?').bind(rec_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Recurring tidak ditemukan' }}, 404);
  }
  
  await c.env.DB.prepare('UPDATE recurring SET void = "YA", rev = rev + 1 WHERE rec_id = ? AND rev = ?').bind(rec_id, rev).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'delete', entity: 'recurring', entityId: rec_id,
    ringkas: `Hapus recurring: ${existing.nama}`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// Helper functions
function calculateNextDue(rec: any): string | null {
  const today = new Date().toISOString().split('T')[0];
  const { year, month } = parsePeriod(new Date().toISOString().slice(0, 7));
  
  for (let m = 0; m < 12; m++) {
    const checkYear = month + m > 12 ? year + 1 : year;
    const checkMonth = month + m > 12 ? month + m - 12 : month + m;
    
    if (!isRecurringDue(rec, `${checkYear}-${String(checkMonth).padStart(2, '0')}`)) continue;
    
    const dueDate = calculateDueDate(rec, `${checkYear}-${String(checkMonth).padStart(2, '0')}`);
    if (dueDate >= today) return dueDate;
  }
  
  return null;
}

function isRecurringDue(rec: any, periode: string): boolean {
  const [y, m] = periode.split('-').map(Number);
  const startDate = new Date(rec.tanggal_mulai);
  const endDate = rec.tanggal_akhir ? new Date(rec.tanggal_akhir) : null;
  
  const periodStart = new Date(y, m - 1, 1);
  const periodEnd = new Date(y, m, 0);
  
  if (startDate > periodEnd) return false;
  if (endDate && endDate < periodStart) return false;
  return true;
}

function calculateDueDate(rec: any, periode: string): string | null {
  const [y, m] = periode.split('-').map(Number);
  
  switch (rec.frekuensi) {
    case 'bulanan':
    case 'tahunan':
      const day = Math.min(rec.hari_tanggal || 1, new Date(y, m, 0).getDate());
      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'mingguan':
    case 'harian':
      return `${y}-${String(m).padStart(2, '0')}-01`;
    default:
      return `${y}-${String(m).padStart(2, '0')}-01`;
  }
}

function parsePeriod(period: string): { year: number; month: number } {
  const [y, m] = period.split('-').map(Number);
  return { year: y, month: m };
}