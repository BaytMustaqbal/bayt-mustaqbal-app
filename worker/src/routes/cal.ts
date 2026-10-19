import { Hono } from 'hono';
import { Env } from '../types/env';

export const calRoutes = new Hono<{ Bindings: Env }>();

// GET /api/cal — list calendar events (ordered by date DESC)
calRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const results = await c.env.DB.prepare(
    'SELECT * FROM calendar_events WHERE user_id = ? AND void IS NULL ORDER BY date DESC'
  ).bind(userId).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/cal — create calendar event
calRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { title, date, time, category, member_id, description } = await c.req.json() as {
    title: string; date: string; time?: string; category?: string; member_id?: string; description?: string;
  };

  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO calendar_events (id, user_id, title, date, time, category, member_id, description, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, title, date, time || null, category || null, member_id || null, description || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, title, date, time: time || null, category: category || null, member_id: member_id || null, description: description || null, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/cal/:id — detail by id
calRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/cal/:id — update (increment rev)
calRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }

  const { title, date, time, category, member_id, description } = await c.req.json() as {
    title?: string; date?: string; time?: string; category?: string; member_id?: string; description?: string;
  };

  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE calendar_events SET title = ?, date = ?, time = ?, category = ?, member_id = ?, description = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(title, date, time || null, category || null, member_id || null, description || null, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/cal/:id — soft delete (SET void = now)
calRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE calendar_events SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
