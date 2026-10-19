import { Hono } from 'hono';
import { Env } from '../types/env';

export const billRoutes = new Hono<{ Bindings: Env }>();

// GET /api/bill — list bills (ordered by due_date ASC)
billRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const results = await c.env.DB.prepare(
    'SELECT * FROM bills WHERE user_id = ? AND void IS NULL ORDER BY due_date ASC'
  ).bind(userId).all();

  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/bill — create bill
billRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, amount, due_date, recurring_id } = await c.req.json() as {
    name: string; amount: number; due_date: string; recurring_id?: string;
  };

  if (!name || amount == null || !due_date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, amount, due_date' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO bills (id, user_id, name, amount, due_date, status, paid_at, recurring_id, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, amount, due_date, 'unpaid', null, recurring_id || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, name, amount, due_date, status: 'unpaid', paid_at: null, recurring_id, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/bill/:id — detail by id
billRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM bills WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Bill tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/bill/:id — update (increment rev)
billRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM bills WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Bill tidak ditemukan' } }, 404);
  }

  const { name, amount, due_date, status, paid_at, recurring_id } = await c.req.json() as {
    name?: string; amount?: number; due_date?: string; status?: string; paid_at?: string; recurring_id?: string;
  };

  if (!name || amount == null || !due_date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, amount, due_date' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE bills SET name = ?, amount = ?, due_date = ?, status = ?, paid_at = ?, recurring_id = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(name, amount, due_date, status || 'unpaid', paid_at || null, recurring_id || null, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM bills WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/bill/:id — soft delete (SET void = now)
billRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM bills WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Bill tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE bills SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
