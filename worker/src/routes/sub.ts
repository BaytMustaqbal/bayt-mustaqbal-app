import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

// Kategori langganan/utilitas (sinkron frontend).
export const SUB_CATEGORIES = ['listrik', 'air', 'internet', 'streaming', 'asuransi', 'lainnya'];

export const subRoutes = new Hono<{ Bindings: Env }>();

const toRow = (r: any) => ({
  id: r.id,
  name: r.name,
  category: r.category || 'lainnya',
  amount: Number(r.amount) || 0,
  billing_day: Number(r.billing_day) || 1,
  active: r.active === 1,
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

// GET /api/sub — list langganan.
subRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const results = await c.env.DB.prepare(
    `SELECT * FROM subscriptions WHERE ${scope.sql} AND void IS NULL ORDER BY active DESC, name ASC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: (results.results || []).map(toRow), error: null });
});

// POST /api/sub — buat langganan.
subRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { name, category, amount, billing_day, active } = await c.req.json() as {
    name: string; category?: string; amount?: number; billing_day?: number; active?: boolean;
  };
  if (!name?.trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nama wajib diisi' } }, 400);
  }
  const day = Number(billing_day);
  if (!(day >= 1 && day <= 31)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Tanggal tagih harus 1-31' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const cat = category && SUB_CATEGORIES.includes(category) ? category : 'lainnya';
  await c.env.DB.prepare(
    `INSERT INTO subscriptions (id, user_id, group_id, name, category, amount, billing_day, active, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, name.trim(), cat, Number(amount) || 0, day, active === false ? 0 : 1, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null });
});

// PUT /api/sub/:id — ubah.
subRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM subscriptions WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Langganan tidak ditemukan' } }, 404);

  const { name, category, amount, billing_day, active } = await c.req.json() as {
    name?: string; category?: string; amount?: number; billing_day?: number; active?: boolean;
  };
  const day = billing_day !== undefined ? Number(billing_day) : existing.billing_day;
  if (!(day >= 1 && day <= 31)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Tanggal tagih harus 1-31' } }, 400);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE subscriptions SET name = ?, category = ?, amount = ?, billing_day = ?, active = ?, rev = rev + 1, updated_at = ?
     WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(
    name !== undefined ? name.trim() : existing.name,
    category && SUB_CATEGORIES.includes(category) ? category : existing.category,
    amount !== undefined ? Number(amount) : existing.amount,
    day,
    active !== undefined ? (active === false ? 0 : 1) : existing.active,
    now, id, scope.val
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

// DELETE /api/sub/:id — soft delete.
subRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM subscriptions WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Langganan tidak ditemukan' } }, 404);
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE subscriptions SET void = ?, updated_at = ? WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(now, now, id, scope.val).run();
  return c.json({ ok: true, data: { id, void: now }, error: null });
});
