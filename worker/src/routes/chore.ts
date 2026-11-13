import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Tugas Rumah Tangga bersama (chores) — data grup, soft delete.
 */
export const choreRoutes = new Hono<{ Bindings: Env }>();

choreRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM chores WHERE ${scope.sql} AND void IS NULL ORDER BY
       CASE WHEN status = 'open' THEN 0 ELSE 1 END,
       due_date ASC, created_at DESC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: rows.results || [], error: null });
});

choreRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const { title, assigneeId, dueDate } = await c.req.json().catch(() => ({})) as {
    title?: string; assigneeId?: string; dueDate?: string;
  };
  if (!title || !String(title).trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Judul tugas wajib diisi' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO chores (id, user_id, group_id, title, assignee_id, due_date, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, c.get('userId'), c.get('groupId'), String(title).trim(), assigneeId || null, dueDate || null, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM chores WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: created, error: null }, 201);
});

choreRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM chores WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Tugas tidak ditemukan' } }, 404);
  }
  const { title, assigneeId, dueDate, status } = await c.req.json().catch(() => ({})) as {
    title?: string; assigneeId?: string; dueDate?: string; status?: string;
  };
  const now = new Date().toISOString();
  const newStatus = status === 'done' ? 'done' : status === 'open' ? 'open' : existing.status;
  const completedAt = newStatus === 'done' ? (existing.completed_at || now) : null;
  await c.env.DB.prepare(
    `UPDATE chores SET title = ?, assignee_id = ?, due_date = ?, status = ?, completed_at = ?,
       rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(
    title !== undefined ? String(title).trim() : existing.title,
    assigneeId !== undefined ? (assigneeId || null) : existing.assignee_id,
    dueDate !== undefined ? (dueDate || null) : existing.due_date,
    newStatus,
    completedAt,
    now,
    id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM chores WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: updated, error: null });
});

choreRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM chores WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Tugas tidak ditemukan' } }, 404);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE chores SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id, void: now }, error: null });
});
