// worker/src/routes/transactions.ts
// Transaction routes

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateTransactionCreate, validateTransactionUpdate, validatePagination } from '../middleware/validate';
import { getCurrentPeriod, today, now, generateId, writeAudit } from '../utils/db';
import type { Env } from '../types/env';

export const txnRoutes = new Hono<{ Bindings: Env }>();

txnRoutes.use('*', authMiddleware);

// GET /api/txn/list
txnRoutes.get('/list', validatePagination, async (c) => {
  const user = c.get('user');
  const { page, pageSize, sortBy, sortDir, ...filters } = c.req.valid('query');
  
  let where = 'WHERE t.void != "YA"';
  const params: any[] = [];
  
  // User filter
  if (user.role !== 'admin') {
    where += ' AND t.dibuat_oleh = ?';
    params.push(user.email);
  }
  
  // Additional filters
  if (filters.periode) { where += ' AND t.periode = ?'; params.push(filters.periode); }
  if (filters.tipe) { where += ' AND t.tipe = ?'; params.push(filters.tipe); }
  if (filters.kategori_id) { where += ' AND t.kategori_id = ?'; params.push(filters.kategori_id); }
  if (filters.scope) { where += ' AND t.scope = ?'; params.push(filters.scope); }
  if (filters.metode) { where += ' AND t.metode = ?'; params.push(filters.metode); }
  if (filters.startDate) { where += ' AND t.tanggal >= ?'; params.push(filters.startDate); }
  if (filters.endDate) { where += ' AND t.tanggal <= ?'; params.push(filters.endDate); }
  
  const sort = filters.sortBy ? `ORDER BY t.${filters.sortBy} ${filters.sortDir === 'asc' ? 'ASC' : 'DESC'}` : 'ORDER BY t.tanggal DESC';
  const offset = (page - 1) * pageSize;
  
  // Count total
  const countSql = `SELECT COUNT(*) as total FROM transactions t ${where}`;
  const { results: countResult } = await c.env.DB.prepare(countSql).bind(...params).all();
  const total = countResult[0]?.total ?? 0;
  
  // Get data with joins
  const dataSql = `
    SELECT t.*, c.nama as kategori_nama, c.warna as kategori_warna, a.nama as account_nama
    FROM transactions t
    LEFT JOIN categories c ON t.kategori_id = c.category_id
    LEFT JOIN accounts a ON t.account_id = a.account_id
    ${where}
    ${sort}
    LIMIT ? OFFSET ?
  `;
  
  const { results } = await c.env.DB.prepare(dataSql).bind(...params, pageSize, offset).all();
  
  // Enrich
  const enriched = results.map(r => ({
    ...r,
    tipe_icon: r.tipe === 'income' ? '📈' : '📉',
    tipe_color: r.tipe === 'income' ? '#4CAF50' : '#f44336',
    scope_icon: { pribadi: '👤', keluarga: '👨‍👩‍👧', usaha: '🏪' }[r.scope] || '📁',
    method_icon: { tunai: '💵', transfer: '🏦', debit: '💳', kredit: '💳', ewallet: '📱' }[r.metode] || '💰',
    formatted_jumlah: `Rp ${Number(r.jumlah).toLocaleString('id-ID')}`,
    formatted_tanggal: formatDate(r.tanggal),
    can_edit: r.dibuat_oleh === user.email && daysBetween(r.tanggal, today()) <= 1
  }));
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// POST /api/txn/create
txnRoutes.post('/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  // Manual validation (could use zValidator but keeping manual for flexibility)
  const required = ['tanggal', 'tipe', 'kategori_id', 'jumlah', 'account_id', 'scope', 'metode'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'VALIDATION', message: `${field} wajib diisi` }
      }, 400);
    }
  }
  
  // Validate references
  const cat = await c.env.DB.prepare('SELECT * FROM categories WHERE category_id = ? AND aktif = "YA"').bind(body.kategori_id).first();
  if (!cat) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'Kategori tidak ditemukan atau tidak aktif' }
    }, 400);
  }
  
  const acc = await c.env.DB.prepare('SELECT * FROM accounts WHERE account_id = ? AND aktif = "YA"').bind(body.account_id).first();
  if (!acc) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'Rekening tidak ditemukan atau tidak aktif' }
    }, 400);
  }
  
  // Validate tipe matches category
  if (cat.tipe !== body.tipe) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'Tipe transaksi tidak cocok dengan tipe kategori' }
    }, 400);
  }
  
  const txnId = generateId();
  const periode = body.tanggal.slice(0, 7);
  const timestamp = now();
  
  await c.env.DB.prepare(`
    INSERT INTO transactions (
      txn_id, tanggal, periode, tipe, kategori_id, kategori_nama, jumlah, account_id,
      scope, metode, keterangan, tags, recurring_id, bill_id, void,
      dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TIDAK', ?, ?, ?, ?, 1)
  `).bind(
    txnId, body.tanggal, periode, body.tipe, body.kategori_id, cat.nama,
    Number(body.jumlah), body.account_id, body.scope, body.metode,
    body.keterangan || '', body.tags || '', body.recurring_id || '', body.bill_id || '',
    user.email, timestamp, user.email, timestamp
  ).run();
  
  await writeAudit(c.env.DB, {
    email: user.email,
    role: user.role,
    aksi: 'create',
    entity: 'transactions',
    entityId: txnId,
    ringkas: `${body.tipe === 'income' ? 'Pemasukan' : 'Pengeluaran'}: ${cat.nama} Rp ${Number(body.jumlah).toLocaleString('id-ID')}`
  });
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: { txn_id: txnId }
  });
});

// PUT /api/txn/update
txnRoutes.put('/update', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  if (!body.txn_id || !body.rev) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'txn_id dan rev wajib diisi' }
    }, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE txn_id = ?').bind(body.txn_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' }
    }, 404);
  }
  
  // Check permission
  const isOwner = existing.dibuat_oleh === user.email;
  const isRecent = daysBetween(existing.tanggal, today()) <= 1;
  
  if (!isAdmin(user) && (!isOwner || !isRecent)) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Tidak bisa mengedit transaksi ini (hanya pemilik dalam 24 jam, atau admin)' }
    }, 403);
  }
  
  // Validate category if changed
  if (body.kategori_id && body.kategori_id !== existing.kategori_id) {
    const newCat = await c.env.DB.prepare('SELECT * FROM categories WHERE category_id = ? AND aktif = "YA"').bind(body.kategori_id).first();
    if (!newCat) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'VALIDATION', message: 'Kategori baru tidak valid' }
      }, 400);
    }
    body.kategori_nama = newCat.nama;
    if (newCat.tipe !== existing.tipe) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'VALIDATION', message: 'Tipe kategori tidak cocok dengan tipe transaksi' }
      }, 400);
    }
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  const allowedFields = ['tanggal', 'kategori_id', 'kategori_nama', 'jumlah', 'account_id', 'scope', 'metode', 'keterangan', 'tags'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(field === 'jumlah' ? Number(body[field]) : body[field]);
    }
  }
  
  if (body.tanggal) {
    updates.push('periode = ?');
    params.push(body.tanggal.slice(0, 7));
  }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }
    }, 400);
  }
  
  updates.push('diubah_oleh = ?', 'diubah_pada = ?', 'rev = rev + 1');
  params.push(user.email, now(), body.txn_id, body.rev);
  
  await c.env.DB.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE txn_id = ? AND rev = ?`).bind(...params).run();
  
  await writeAudit(c.env.DB, {
    email: user.email,
    role: user.role,
    aksi: 'update',
    entity: 'transactions',
    entityId: body.txn_id,
    ringkas: `Update transaksi Rp ${Number(body.jumlah || existing.jumlah).toLocaleString('id-ID')}`,
    sebelum: existing,
    sesudah: { ...existing, ...body }
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/txn/delete
txnRoutes.delete('/delete', async (c) => {
  const user = c.get('user');
  const { txn_id, rev } = c.req.query();
  
  if (!txn_id || !rev) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'txn_id dan rev wajib diisi' }
    }, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE txn_id = ?').bind(txn_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' }
    }, 404);
  }
  
  const isOwner = existing.dibuat_oleh === user.email;
  const isRecent = daysBetween(existing.tanggal, today()) <= 1;
  
  if (!isAdmin(user) && (!isOwner || !isRecent)) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Tidak bisa menghapus transaksi ini' }
    }, 403);
  }
  
  // If transaction pays a bill, reopen bill
  if (existing.bill_id) {
    await c.env.DB.prepare(`
      UPDATE bills SET status = 'belum', lunas_pada = '', txn_id = '', remind_sent = 'TIDAK'
      WHERE bill_id = ? AND status = 'lunas' AND txn_id = ?
    `).bind(existing.bill_id, txn_id).run();
  }
  
  await c.env.DB.prepare('UPDATE transactions SET void = "YA", rev = rev + 1 WHERE txn_id = ? AND rev = ?').bind(txn_id, rev).run();
  
  await writeAudit(c.env.DB, {
    email: user.email,
    role: user.role,
    aksi: 'delete',
    entity: 'transactions',
    entityId: txn_id,
    ringkas: `Hapus transaksi Rp ${Number(existing.jumlah).toLocaleString('id-ID')}`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// Helper functions
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function isAdmin(user: any): boolean {
  return user?.role === 'admin';
}