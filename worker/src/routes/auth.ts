import { Hono } from 'hono';
import { hashPassword, verifyPassword, signToken } from '../utils/auth';
import { Env } from '../types/env';

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  const { username, password, nama, family_role, generasi, birth_date } = await c.req.json() as {
    username: string; password: string; nama: string;
    family_role?: string; generasi?: string; birth_date?: string;
  };
  if (!username || !password || !nama) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: username, password, nama' } }, 400);
  }
  // Username wajib berupa alamat email yang valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(username)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Username harus berupa alamat email yang valid' } }, 400);
  }
  // Status keluarga: suami | istri | anak | lainnya (default anak)
  const FAMILY_ROLES = ['suami', 'istri', 'anak', 'lainnya'];
  const role = family_role && FAMILY_ROLES.includes(family_role) ? family_role : 'anak';
  // Posisi silsilah: orangtua | anak | cucu (default orangtua)
  const GENERASI = ['orangtua', 'anak', 'cucu'];
  const gen = generasi && GENERASI.includes(generasi) ? generasi : 'orangtua';
  // Tanggal lahir opsional — format ISO YYYY-MM-DD, null kalau kosong/invalid
  const birth = birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null;
  const hash = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await c.env.DB.prepare('INSERT INTO users (id, username, password_hash, nama, role, family_role, generasi, birth_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, username, hash, nama, 'user', role, gen, birth, now, now).run();
    return c.json({ ok: true, data: { id, username, nama, role: 'user', family_role: role, generasi: gen, birth_date: birth }, error: null });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: 'Username sudah ada' } }, 409);
    }
    throw e;
  }
});

// GET /api/auth/users — daftar anggota keluarga (butuh token)
// Master account disembunyikan (hanya untuk admin/register, bukan anggota).
authRoutes.get('/users', async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT id, username, nama, family_role, generasi, birth_date, avatar_url, created_at FROM users WHERE void IS NULL AND username != 'baytmustaqbal@gmail.com' ORDER BY created_at ASC"
  ).all();
  return c.json({ ok: true, data: results.results || [], error: null });
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
  return c.json({ ok: true, data: { token, user: { id: user.id, username: user.username, nama: user.nama, role: user.role, family_role: user.family_role || 'anak', generasi: user.generasi || 'orangtua', birth_date: user.birth_date || null } }, error: null });
});

// POST /api/auth/logout
authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  return c.json({ ok: true, data: null, error: null });
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT id, username, nama, avatar_url, role, family_role, generasi, birth_date FROM users WHERE id = ? AND void IS NULL')
    .bind(userId).first();
  if (!user) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } }, 404);
  }
  return c.json({ ok: true, data: user, error: null });
});
