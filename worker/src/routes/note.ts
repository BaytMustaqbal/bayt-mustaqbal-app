import { Hono } from 'hono';
import { Env } from '../types/env';

export const noteRoutes = new Hono<{ Bindings: Env }>();

// GET /api/note — list notes (ordered by created_at DESC, important first)
noteRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const category = c.req.query('category');

  let query = 'SELECT * FROM notes WHERE user_id = ? AND void IS NULL';
  const params: any[] = [userId];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY important DESC, created_at DESC';

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/note — create note
noteRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { title, content, category, important } = await c.req.json() as {
    title: string; content?: string; category?: string; important?: number;
  };

  if (!title) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO notes (id, user_id, title, content, category, important, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, title, content || null, category || null, important || 0, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, title, content: content || null, category: category || null, important: important || 0, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/note/:id — detail by id
noteRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM notes WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Note tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/note/:id — update (increment rev)
noteRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM notes WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Note tidak ditemukan' } }, 404);
  }

  const { title, content, category, important } = await c.req.json() as {
    title?: string; content?: string; category?: string; important?: number;
  };

  if (!title) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE notes SET title = ?, content = ?, category = ?, important = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(title, content || null, category || null, important || 0, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM notes WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/note/:id — soft delete (SET void = now)
noteRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM notes WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Note tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE notes SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
