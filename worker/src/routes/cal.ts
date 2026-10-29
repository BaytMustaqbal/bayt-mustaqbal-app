import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';
import { syncToGcal } from '../utils/gcal';

export const calRoutes = new Hono<{ Bindings: Env }>();

// GET /api/cal — list calendar events (ordered by date DESC)
// Scope: data Grup Keluarga (semua anggota lihat data yang sama).
calRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const results = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE ${scope.sql} AND void IS NULL ORDER BY date DESC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/cal — create calendar event. user_id = penulis; group_id = pemilik data.
calRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { title, date, time, category, member_id, description } = await c.req.json() as {
    title: string; date: string; time?: string; category?: string; member_id?: string; description?: string;
  };

  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO calendar_events (id, user_id, group_id, title, date, time, category, member_id, description, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, groupId, title, date, time || null, category || null, member_id || null, description || null, 1, now, now).run();

  // Sinkron ke Google Calendar (diam-diam; gagal? cron yang ulang)
  await syncToGcal(c.env, { writerUserId: userId, groupId, entityType: 'cal', entityId: id, action: 'upsert' });

  return c.json({ ok: true, data: { id, user_id: userId, group_id: groupId, title, date, time: time || null, category: category || null, member_id: member_id || null, description: description || null, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/cal/:id — detail by id
calRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const result = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/cal/:id — update (increment rev). Butuh peran tulis.
calRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }

  const { title, date, time, category, member_id, description } = await c.req.json() as {
    title?: string; date?: string; time?: string; category?: string; member_id?: string; description?: string;
  };

  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE calendar_events SET title = ?, date = ?, time = ?, category = ?, member_id = ?, description = ?, rev = rev + 1, updated_at = ? WHERE id = ?'
  ).bind(title, date, time || null, category || null, member_id || null, description || null, now, id).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND void IS NULL'
  ).bind(id).first() as any;

  await syncToGcal(c.env, { writerUserId: userId, groupId, entityType: 'cal', entityId: id, action: 'upsert' });

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/cal/:id — soft delete (SET void = now). Butuh peran tulis.
calRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE calendar_events SET void = ? WHERE id = ?'
  ).bind(now, id).run();

  await syncToGcal(c.env, { writerUserId: userId, groupId, entityType: 'cal', entityId: id, action: 'delete' });

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
