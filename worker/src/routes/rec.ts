import { Hono } from 'hono';
import { Env } from '../types/env';

export const recRoutes = new Hono<{ Bindings: Env }>();

// GET /api/rec — list recurring (ordered by start_date DESC)
recRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const results = await c.env.DB.prepare(
    'SELECT * FROM recurring WHERE user_id = ? AND void IS NULL ORDER BY start_date DESC'
  ).bind(userId).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/rec — create recurring
recRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, amount, frequency, start_date, end_date, category_id } = await c.req.json() as {
    name: string; amount: number; frequency: string; start_date: string; end_date?: string; category_id?: string;
  };

  if (!name || amount == null || !frequency || !start_date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, amount, frequency, start_date' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO recurring (id, user_id, name, amount, frequency, start_date, end_date, category_id, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, amount, frequency, start_date, end_date || null, category_id || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, name, amount, frequency, start_date, end_date: end_date || null, category_id: category_id || null, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/rec/:id — detail by id
recRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM recurring WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Recurring tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/rec/:id — update (increment rev)
recRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM recurring WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Recurring tidak ditemukan' } }, 404);
  }

  const { name, amount, frequency, start_date, end_date, category_id } = await c.req.json() as {
    name?: string; amount?: number; frequency?: string; start_date?: string; end_date?: string; category_id?: string;
  };

  if (!name || amount == null || !frequency || !start_date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, amount, frequency, start_date' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE recurring SET name = ?, amount = ?, frequency = ?, start_date = ?, end_date = ?, category_id = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(name, amount, frequency, start_date, end_date || null, category_id || null, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM recurring WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/rec/:id — soft delete (SET void = now)
recRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM recurring WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Recurring tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE recurring SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
