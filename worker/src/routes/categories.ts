import { Hono } from 'hono';
import { Env } from '../types/env';

export const categoriesRoutes = new Hono<{ Bindings: Env }>();

// GET /api/categories — list categories, optional ?type= filter
categoriesRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const type = c.req.query('type');

  let query = 'SELECT * FROM categories WHERE user_id = ? AND void IS NULL';
  const params: any[] = [userId];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY name ASC';

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/categories — create category
categoriesRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, type, icon, color } = await c.req.json() as {
    name: string; type: string; icon?: string; color?: string;
  };

  if (!name || !type) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, type' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO categories (id, user_id, name, type, icon, color, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, type, icon || null, color || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, name, type, icon, color, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/categories/:id — detail by id
categoriesRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Category tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/categories/:id — update (increment rev)
categoriesRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Category tidak ditemukan' } }, 404);
  }

  const { name, type, icon, color } = await c.req.json() as {
    name?: string; type?: string; icon?: string; color?: string;
  };

  if (!name || !type) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, type' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE categories SET name = ?, type = ?, icon = ?, color = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(name, type, icon || null, color || null, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/categories/:id — soft delete (SET void = now)
categoriesRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Category tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE categories SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
