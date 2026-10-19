import { Hono } from 'hono';
import { Env } from '../types/env';

export const svcRoutes = new Hono<{ Bindings: Env }>();

// GET /api/svc — list service assets (ordered by name ASC)
svcRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const results = await c.env.DB.prepare(
    'SELECT * FROM service_asset WHERE user_id = ? AND void IS NULL ORDER BY name ASC'
  ).bind(userId).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/svc — create service asset
svcRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, type, purchase_date, warranty_expiry } = await c.req.json() as {
    name: string; type: string; purchase_date?: string; warranty_expiry?: string;
  };

  if (!name || !type) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, type' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO service_asset (id, user_id, name, type, purchase_date, warranty_expiry, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, type, purchase_date || null, warranty_expiry || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, name, type, purchase_date: purchase_date || null, warranty_expiry: warranty_expiry || null, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/svc/:id — detail by id
// Note: /:id/log is a separate route, matched by Hono based on path pattern
svcRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM service_asset WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Service asset tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/svc/:id — update (increment rev)
svcRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM service_asset WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Service asset tidak ditemukan' } }, 404);
  }

  const { name, type, purchase_date, warranty_expiry } = await c.req.json() as {
    name?: string; type?: string; purchase_date?: string; warranty_expiry?: string;
  };

  if (!name || !type) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: name, type' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE service_asset SET name = ?, type = ?, purchase_date = ?, warranty_expiry = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(name, type, purchase_date || null, warranty_expiry || null, now, id, userId).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM service_asset WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/svc/:id — soft delete (SET void = now)
svcRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM service_asset WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Service asset tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE service_asset SET void = ? WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(now, id, userId).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});

// GET /api/svc/:id/log — list service logs for an asset
svcRoutes.get('/:id/log', async (c) => {
  const userId = c.get('userId');
  const assetId = c.req.param('id');

  // Verify asset exists and belongs to user
  const asset = await c.env.DB.prepare(
    'SELECT id FROM service_asset WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(assetId, userId).first() as any;

  if (!asset) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Service asset tidak ditemukan' } }, 404);
  }

  const results = await c.env.DB.prepare(
    'SELECT * FROM service_log WHERE asset_id = ? AND void IS NULL ORDER BY date DESC'
  ).bind(assetId).all();

  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/svc/:id/log — create service log entry
svcRoutes.post('/:id/log', async (c) => {
  const userId = c.get('userId');
  const assetId = c.req.param('id');

  // Verify asset exists and belongs to user
  const asset = await c.env.DB.prepare(
    'SELECT id FROM service_asset WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(assetId, userId).first() as any;

  if (!asset) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Service asset tidak ditemukan' } }, 404);
  }

  const { date, description, cost } = await c.req.json() as {
    date: string; description?: string; cost?: number;
  };

  if (!date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: date' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO service_log (id, asset_id, date, description, cost, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, assetId, date, description || null, cost || null, 1, now, now).run();

  return c.json({ ok: true, data: { id, asset_id: assetId, date, description: description || null, cost: cost || null, rev: 1, created_at: now, updated_at: now }, error: null });
});
