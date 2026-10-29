import { Context, Next } from 'hono';
import { verifyToken } from '../utils/auth';
import { Env } from '../types/env';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const path = c.req.path;
  if (path === '/api/auth/login' || path === '/api/auth/register' || path === '/api/gcal/callback') {
    return next();
  }
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1] || null;
  if (!token) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Token tidak ada' } }, 401);
  }
  const payload = verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Token invalid' } }, 401);
  }
  c.set('userId', payload.userId);
  c.set('role', payload.role);

  // Konteks grup keluarga: data aplikasi dipisah per grup, hak tulis per peran.
  const row = await c.env.DB.prepare(
    'SELECT group_id, group_role FROM users WHERE id = ?'
  ).bind(payload.userId).first() as { group_id: string | null; group_role: string | null } | null;
  c.set('groupId', row?.group_id ?? null);
  c.set('groupRole', row?.group_role ?? 'anak');

  await next();
}
