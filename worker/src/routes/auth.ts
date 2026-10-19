import { Hono } from 'hono';
import { hashPassword, verifyPassword, signToken } from '../utils/auth';
import { Env } from '../types/env';

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  const { username, password, nama } = await c.req.json() as { username: string; password: string; nama: string };
  if (!username || !password || !nama) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: username, password, nama' } }, 400);
  }
  const hash = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await c.env.DB.prepare('INSERT INTO users (id, username, password_hash, nama, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, username, hash, nama, 'user', now, now).run();
    return c.json({ ok: true, data: { id, username, nama, role: 'user' }, error: null });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: 'Username sudah ada' } }, 409);
    }
    throw e;
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json() as { username: string; password: string };
  if (!username || !password) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: username, password' } }, 400);
  }
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND void IS NULL')
    .bind(username).first() as any;
  if (!user) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Username atau password salah' } }, 401);
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Username atau password salah' } }, 401);
  }
  const token = signToken({ userId: user.id, role: user.role }, c.env.JWT_SECRET);
  c.header('Set-Cookie', `token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`);
  return c.json({ ok: true, data: { token, user: { id: user.id, username: user.username, nama: user.nama, role: user.role } }, error: null });
});

// POST /api/auth/logout
authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  return c.json({ ok: true, data: null, error: null });
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT id, username, nama, avatar_url, role FROM users WHERE id = ? AND void IS NULL')
    .bind(userId).first();
  if (!user) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } }, 404);
  }
  return c.json({ ok: true, data: user, error: null });
});
