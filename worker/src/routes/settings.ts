import { Hono } from 'hono';
import { Env } from '../types/env';

export const settingsRoutes = new Hono<{ Bindings: Env }>();

// GET /api/settings — list all settings user
settingsRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const results = await c.env.DB.prepare(
    'SELECT * FROM settings WHERE user_id = ? AND void IS NULL ORDER BY key ASC'
  ).bind(userId).all();

  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/settings — create setting
settingsRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { key, value } = await c.req.json() as {
    key: string; value: string;
  };

  if (!key || value == null) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: key, value' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      'INSERT INTO settings (id, user_id, key, value, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, key, value, 1, now, now).run();
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: 'Key sudah ada untuk pengguna ini' } }, 409);
    }
    throw e;
  }

  return c.json({ ok: true, data: { id, user_id: userId, key, value, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/settings/:id — detail by id
settingsRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM settings WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Setting tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/settings/:id — update (increment rev)
settingsRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM settings WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Setting tidak ditemukan' } }, 404);
  }

  const { key, value } = await c.req.json() as {
    key?: string; value?: string;
  };

  if (!key || value == null) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: key, value' } }, 400);
  }

  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      'UPDATE settings SET key = ?, value = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
    ).bind(key, value, now, id, userId).run();
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: 'Key sudah ada untuk pengguna ini' } }, 409);
    }
    throw e;
  }

  const updated = await c.env.DB.prepare(
    'SELECT * FROM settings WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/settings/:id — soft delete (SET void = now)
settingsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM settings WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Setting tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE settings SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
