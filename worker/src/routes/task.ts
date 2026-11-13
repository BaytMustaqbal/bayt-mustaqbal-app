import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Tugas keluarga (tasks) — data bersama grup, soft delete.
 * Sama pola dengan modul data bersama lain.
 */
export const taskRoutes = new Hono<{ Bindings: Env }>();

const PRIORITIES = ['tinggi', 'sedang', 'rendah'];

taskRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM tasks WHERE ${scope.sql} AND void IS NULL ORDER BY created_at DESC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: rows.results || [], error: null });
});

taskRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const { title, dueDate, priority, assignedTo } = await c.req.json().catch(() => ({})) as {
    title?: string; dueDate?: string; priority?: string; assignedTo?: string;
  };
  if (!title || !String(title).trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Judul tugas wajib diisi' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const prio = PRIORITIES.includes(priority || '') ? priority : 'sedang';
  await c.env.DB.prepare(
    `INSERT INTO tasks (id, user_id, group_id, title, due_date, priority, assigned_to, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, c.get('userId'), c.get('groupId'), String(title).trim(), dueDate || null, prio, assignedTo || null, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: created, error: null }, 201);
});

taskRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM tasks WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Tugas tidak ditemukan' } }, 404);
  }
  const { title, dueDate, priority, assignedTo, completed } = await c.req.json().catch(() => ({})) as {
    title?: string; dueDate?: string; priority?: string; assignedTo?: string; completed?: boolean;
  };
  const now = new Date().toISOString();
  const prio = priority !== undefined ? (PRIORITIES.includes(priority) ? priority : existing.priority) : existing.priority;
  const newCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;
  await c.env.DB.prepare(
    `UPDATE tasks SET title = ?, due_date = ?, priority = ?, assigned_to = ?, completed = ?, rev = rev + 1, updated_at = ?
     WHERE id = ?`
  ).bind(
    title !== undefined ? String(title).trim() : existing.title,
    dueDate !== undefined ? (dueDate || null) : existing.due_date,
    prio,
    assignedTo !== undefined ? (assignedTo || null) : existing.assigned_to,
    newCompleted,
    now,
    id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: updated, error: null });
});

taskRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM tasks WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Tugas tidak ditemukan' } }, 404);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE tasks SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id, void: now }, error: null });
});
