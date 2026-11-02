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
  const { nama, target_amount, current_amount, target_date } = await c.req.json() as {
    nama: string; target_amount?: number; current_amount?: number; target_date?: string | null;
  };
  if (!nama) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'nama wajib' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO goals (id, user_id, group_id, nama, target_amount, current_amount, target_date, achieved, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, nama, Number(target_amount) || 0, Number(current_amount) || 0, target_date || null, Number(current_amount) >= Number(target_amount) ? 1 : 0, now, now).run();
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
  const body = await c.req.json() as { nama?: string; target_amount?: number; current_amount?: number; target_date?: string | null };
  const targetAmount = body.target_amount != null ? Number(body.target_amount) : existing.target_amount;
  const currentAmount = body.current_amount != null ? Number(body.current_amount) : existing.current_amount;
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE goals SET nama = ?, target_amount = ?, current_amount = ?, target_date = ?, achieved = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(body.nama ?? existing.nama, targetAmount, currentAmount, body.target_date !== undefined ? body.target_date : existing.target_date, currentAmount >= targetAmount ? 1 : 0, now, id).run();
  const updated = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: updated, error: null });
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
