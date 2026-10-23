import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

export const noteRoutes = new Hono<{ Bindings: Env }>();

// GET /api/note — list notes (ordered by created_at DESC, important first)
// Scope: data Grup Keluarga (semua anggota lihat catatan yang sama).
noteRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const category = c.req.query('category');

  const scope = groupScope(groupId, userId);
  let query = `SELECT * FROM notes WHERE ${scope.sql} AND void IS NULL`;
  const params: any[] = [scope.val];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY important DESC, created_at DESC';

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/note — create note. user_id = penulis; group_id = pemilik data.
noteRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { title, content, category, important } = await c.req.json() as {
    title: string; content?: string; category?: string; important?: number;
  };

  if (!title) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title' } }, 400);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO notes (id, user_id, group_id, title, content, category, important, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, groupId, title, content || null, category || null, important || 0, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, group_id: groupId, title, content: content || null, category: category || null, important: important || 0, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/note/:id — detail by id
noteRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const result = await c.env.DB.prepare(
    `SELECT * FROM notes WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Note tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/note/:id — update (increment rev). Butuh peran tulis.
noteRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM notes WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Note tidak ditemukan' } }, 404);
  }

  const { title, content, category, important } = await c.req.json() as {
    title?: string; content?: string; category?: string; important?: number;
  };

  if (!title) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title' } }, 400);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE notes SET title = ?, content = ?, category = ?, important = ?, rev = rev + 1, updated_at = ? WHERE id = ?'
  ).bind(title, content || null, category || null, important || 0, now, id).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM notes WHERE id = ? AND void IS NULL'
  ).bind(id).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/note/:id — soft delete (SET void = now). Butuh peran tulis.
noteRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM notes WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Note tidak ditemukan' } }, 404);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE notes SET void = ? WHERE id = ?'
  ).bind(now, id).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
