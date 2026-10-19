import { Hono } from 'hono';
import { Env } from '../types/env';

export const txnRoutes = new Hono<{ Bindings: Env }>();

// GET /api/txn — list transactions (ordered by date DESC), optional ?category_id= &date= filters
txnRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const categoryId = c.req.query('category_id');
  const date = c.req.query('date');

  let query = 'SELECT * FROM transactions WHERE user_id = ? AND void IS NULL';
  const params: any[] = [userId];

  if (categoryId) {
    query += ' AND category_id = ?';
    params.push(categoryId);
  }
  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }

  query += ' ORDER BY date DESC';

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/txn — create transaction
txnRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { amount, type, date, category_id, account_id, description } = await c.req.json() as {
    amount: number; type: string; date: string; category_id?: string; account_id?: string; description?: string;
  };

  if (amount == null || !type || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: amount, type, date' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO transactions (id, user_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, category_id || null, account_id || null, amount, type, date, description || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, category_id, account_id, amount, type, date, description, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/txn/:id — detail by id
txnRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Transaction tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/txn/:id — update (increment rev)
txnRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Transaction tidak ditemukan' } }, 404);
  }

  const { amount, type, date, category_id, account_id, description } = await c.req.json() as {
    amount?: number; type?: string; date?: string; category_id?: string; account_id?: string; description?: string;
  };

  if (amount == null || !type || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: amount, type, date' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE transactions SET category_id = ?, account_id = ?, amount = ?, type = ?, date = ?, description = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(category_id || null, account_id || null, amount, type, date, description || null, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/txn/:id — soft delete (SET void = now)
txnRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Transaction tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE transactions SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
