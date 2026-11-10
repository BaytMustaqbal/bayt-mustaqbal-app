import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

export const goalRoutes = new Hono<{ Bindings: Env }>();

// GET /api/goal — list target tabungan (scope grup)
goalRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM goals WHERE ${scope.sql} AND void IS NULL ORDER BY created_at ASC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: rows.results || [], error: null });
});

// POST /api/goal — create
goalRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const { nama, target_amount, current_amount, target_date, category, monthly } = await c.req.json() as {
    nama: string; target_amount?: number; current_amount?: number; target_date?: string | null;
    category?: string; monthly?: number;
  };
  if (!nama) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'nama wajib' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO goals (id, user_id, group_id, nama, target_amount, current_amount, target_date, category, monthly, achieved, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, nama, Number(target_amount) || 0, Number(current_amount) || 0, target_date || null, category || 'lainnya', Number(monthly) || 0, Number(current_amount) >= Number(target_amount) ? 1 : 0, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: created, error: null });
});

// PUT /api/goal/:id
goalRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM goals WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Goal tidak ditemukan' } }, 404);
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const body = await c.req.json() as { nama?: string; target_amount?: number; current_amount?: number; target_date?: string | null; category?: string; monthly?: number };
  const targetAmount = body.target_amount != null ? Number(body.target_amount) : existing.target_amount;
  const currentAmount = body.current_amount != null ? Number(body.current_amount) : existing.current_amount;
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE goals SET nama = ?, target_amount = ?, current_amount = ?, target_date = ?, category = ?, monthly = ?, achieved = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(body.nama ?? existing.nama, targetAmount, currentAmount, body.target_date !== undefined ? body.target_date : existing.target_date, body.category ?? existing.category, body.monthly != null ? Number(body.monthly) : existing.monthly, currentAmount >= targetAmount ? 1 : 0, now, id).run();
  const updated = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: updated, error: null });
});

// GET /api/goal/:id/transactions — riwayat target
goalRoutes.get('/:id/transactions', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const goal = await c.env.DB.prepare(
    `SELECT id FROM goals WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!goal) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Goal tidak ditemukan' } }, 404);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM goal_transactions WHERE goal_id = ? ORDER BY created_at DESC`
  ).bind(id).all();
  return c.json({ ok: true, data: rows.results || [], error: null });
});

// POST /api/goal/:id/transactions — catat penambahan/penarikan
goalRoutes.post('/:id/transactions', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const goal = await c.env.DB.prepare(
    `SELECT * FROM goals WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!goal) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Goal tidak ditemukan' } }, 404);

  const { amount, type, note } = await c.req.json() as { amount?: number; type?: string; note?: string };
  const amt = Number(amount) || 0;
  if (amt <= 0) return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nominal harus > 0' } }, 400);
  const txnType = type === 'out' ? 'out' : 'in';
  const newCurrent = txnType === 'out'
    ? Math.max(0, Number(goal.current_amount) - amt)
    : Number(goal.current_amount) + amt;

  const id2 = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO goal_transactions (id, goal_id, user_id, amount, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id2, id, userId, amt, txnType, note || null, now).run();
  await c.env.DB.prepare(
    `UPDATE goals SET current_amount = ?, achieved = ?, updated_at = ? WHERE id = ?`
  ).bind(newCurrent, newCurrent >= Number(goal.target_amount) ? 1 : 0, now, id).run();
  const updated = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: { transaction: { id: id2, amount: amt, type: txnType, note: note || null, created_at: now }, goal: updated }, error: null });
});

// DELETE /api/goal/:id
goalRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT id FROM goals WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Goal tidak ditemukan' } }, 404);
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  await c.env.DB.prepare('UPDATE goals SET void = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
  return c.json({ ok: true, data: { id }, error: null });
});
