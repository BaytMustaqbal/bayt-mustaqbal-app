// worker/src/routes/categories.ts
// Categories routes (admin only)

import { Hono } from 'hono';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { validateCategoryCreate, validateCategoryUpdate, validateCategoryReorder } from '../middleware/validate';
import { generateId, now, writeAudit } from '../utils/db';
import type { Env } from '../types/env';

export const categoryRoutes = new Hono<{ Bindings: Env }>();

categoryRoutes.use('*', authMiddleware, requireAdmin);

// GET /api/categories/list
categoryRoutes.get('/list', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM categories WHERE void != 'YA' ORDER BY urutan
  `).all();
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: { data: results }
  });
});

// POST /api/categories/create
categoryRoutes.post('/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  const required = ['nama', 'tipe', 'scope'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({
        ok: false, error: { code: 'VALIDATION', message: `${field} wajib diisi` }
      }, 400);
    }
  }
  
  const maxUrutan = await c.env.DB.prepare('SELECT MAX(urutan) as max FROM categories').first();
  const urutan = (maxUrutan?.max ?? 0) + 1;
  
  const catId = generateId();
  const timestamp = now();
  
  await c.env.DB.prepare(`
    INSERT INTO categories (
      category_id, nama, tipe, scope, parent_id, warna, ikon, budget_bulanan, aktif, urutan,
      dibuat_oleh, dibuat_pada
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'YA', ?, ?, ?)
  `).bind(
    catId, body.nama, body.tipe, body.scope, body.parent_id || '',
    body.warna || '#757575', body.ikon || '📁', Number(body.budget_bulanan) || 0,
    urutan, user.email, timestamp
  ).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'create', entity: 'categories', entityId: catId,
    ringkas: `Buat kategori: ${body.nama}`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { category_id: catId } });
});

// PUT /api/categories/update
categoryRoutes.put('/update', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  if (!body.category_id || !body.rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'category_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM categories WHERE category_id = ?').bind(body.category_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' }}, 404);
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  const allowed = ['nama', 'tipe', 'scope', 'parent_id', 'warna', 'ikon', 'budget_bulanan', 'aktif', 'urutan'];
  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(body[field]);
    }
  }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }}, 400);
  }
  
  updates.push('rev = rev + 1');
  params.push(body.category_id, body.rev);
  
  await c.env.DB.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE category_id = ? AND rev = ?`).bind(...params).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'update', entity: 'categories', entityId: body.category_id,
    ringkas: `Update kategori: ${body.nama || existing.nama}`, sebelum: existing, sesudah: body
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/categories/delete
categoryRoutes.delete('/delete', async (c) => {
  const user = c.get('user');
  const { category_id, rev } = c.req.query();
  
  if (!category_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'category_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM categories WHERE category_id = ?').bind(category_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' }}, 404);
  }
  
  // Check if used in transactions
  const used = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE kategori_id = ?').bind(category_id).first();
  
  if (used.cnt > 0) {
    // Soft delete only
    await c.env.DB.prepare('UPDATE categories SET aktif = "TIDAK", rev = rev + 1 WHERE category_id = ? AND rev = ?').bind(category_id, rev).run();
    await writeAudit(c.env.DB, { email: user.email, role: user.role, aksi: 'delete', entity: 'categories', entityId: category_id, ringkas: `Nonaktifkan kategori: ${existing.nama} (masih dipakai ${used.cnt} transaksi)` });
    return c.json<Env['ApiResponse']>({ ok: true, data: { success: true, warning: 'Kategori dinonaktifkan karena masih dipakai transaksi' }});
  }
  
  await c.env.DB.prepare('UPDATE categories SET void = "YA", rev = rev + 1 WHERE category_id = ? AND rev = ?').bind(category_id, rev).run();
  await writeAudit(c.env.DB, { email: user.email, role: user.role, aksi: 'delete', entity: 'categories', entityId: category_id, ringkas: `Hapus kategori: ${existing.nama}` });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// PUT /api/categories/reorder
categoryRoutes.put('/reorder', async (c) => {
  const user = c.get('user');
  const { orders } = await c.req.json();
  
  if (!Array.isArray(orders) || orders.length === 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Orders wajib array' }}, 400);
  }
  
  for (const o of orders) {
    await c.env.DB.prepare('UPDATE categories SET urutan = ? WHERE category_id = ?').bind(o.urutan, o.category_id).run();
  }
  
  await writeAudit(c.env.DB, { email: user.email, role: user.role, aksi: 'update', entity: 'categories', entityId: 'bulk', ringkas: 'Reorder kategori' });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});