import { Hono } from 'hono';
import { Env } from '../types/env';

// CRUD langganan Web Push per user.
export const pushRoutes = new Hono<{ Bindings: Env }>();

// POST /api/push/subscribe — simpan/memperbarui langganan.
pushRoutes.post('/subscribe', async (c) => {
  const userId = c.get('userId');
  const { endpoint, p256dh, auth } = await c.req.json() as { endpoint?: string; p256dh?: string; auth?: string };
  if (!endpoint || !p256dh || !auth) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: endpoint, p256dh, auth' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const existing = await c.env.DB.prepare(
    'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
  ).bind(userId, endpoint).first();
  if (existing) {
    await c.env.DB.prepare(
      'UPDATE push_subscriptions SET p256dh = ?, auth = ?, updated_at = ? WHERE id = ?'
    ).bind(p256dh, auth, now, existing.id).run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, userId, endpoint, p256dh, auth, now, now).run();
  }
  return c.json({ ok: true, data: { subscribed: true }, error: null });
});

// DELETE /api/push/subscribe — hapus langganan (logout / nonaktifkan).
pushRoutes.delete('/subscribe', async (c) => {
  const userId = c.get('userId');
  const { endpoint } = await c.req.json().catch(() => ({})) as { endpoint?: string };
  if (endpoint) {
    await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').bind(userId, endpoint).run();
  } else {
    await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').bind(userId).run();
  }
  return c.json({ ok: true, data: { subscribed: false }, error: null });
});
