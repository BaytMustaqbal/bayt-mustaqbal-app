import { Hono } from 'hono';
import { Env } from '../types/env';

export const attRoutes = new Hono<{ Bindings: Env }>();

// GET /api/att — list attendance (ordered by date DESC)
attRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const results = await c.env.DB.prepare(
    'SELECT * FROM attendance WHERE user_id = ? AND void IS NULL ORDER BY date DESC'
  ).bind(userId).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/att — create attendance
attRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { date, status, note } = await c.req.json() as {
    date: string; status: string; note?: string;
  };

  if (!date || !status) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: date, status' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO attendance (id, user_id, date, status, note, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, date, status, note || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, date, status, note: note || null, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/att/:id — detail by id
attRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM attendance WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Attendance tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/att/:id — update (increment rev)
attRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM attendance WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Attendance tidak ditemukan' } }, 404);
  }

  const { date, status, note } = await c.req.json() as {
    date?: string; status?: string; note?: string;
  };

  if (!date || !status) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: date, status' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE attendance SET date = ?, status = ?, note = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(date, status, note || null, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM attendance WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/att/:id — soft delete (SET void = now)
attRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM attendance WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Attendance tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE attendance SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
