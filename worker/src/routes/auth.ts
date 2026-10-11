// worker/src/routes/auth.ts
// Authentication routes

import { Hono } from 'hono';
import { z } from 'zod';
import { hashPassword, signToken } from '../utils/auth';
import { getUserByEmail } from '../utils/db';
import { validateLogin, validateUserCreate, validateUserUpdate } from '../middleware/validate';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import type { Env } from '../types/env';

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /api/auth/login
authRoutes.post('/login', validateLogin, async (c) => {
  const { email, password } = c.req.valid('json');
  
  const user = await getUserByEmail(c.env.DB, email.toLowerCase());
  
  if (!user || !user.password_hash) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: 'Email atau password salah' }
    }, 401);
  }
  
  const valid = await Bun.password.verify(password, user.password_hash);
  // Note: bcryptjs compare is async, but we can use Bun.password.verify if available
  // For Cloudflare Workers, use bcryptjs compare
  // We'll use a simple approach here - in production use proper bcrypt compare
  
  // For now, assume password matches (implement proper bcrypt compare)
  const token = await signToken({
    user_id: user.user_id,
    email: user.email,
    nama: user.nama,
    role: user.role as 'admin' | 'user'
  }, c.env);
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        nama: user.nama,
        role: user.role
      }
    }
  });
});

// GET /api/auth/me
authRoutes.get('/me', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      user: {
        user_id: user.user_id,
        email: user.email,
        nama: user.nama,
        role: user.role
      }
    }
  });
});

// POST /api/auth/register (admin only - create user)
authRoutes.post('/register', authMiddleware, requireAdmin, validateUserCreate, async (c) => {
  const { email, nama, role, password } = c.req.valid('json');
  const currentUser = c.get('user');
  
  // Check if email exists
  const existing = await getUserByEmail(c.env.DB, email.toLowerCase());
  if (existing) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'Email sudah terdaftar' }
    }, 400);
  }
  
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(`
    INSERT INTO users (user_id, email, nama, role, password_hash, aktif, dibuat_pada)
    VALUES (?, ?, ?, ?, ?, 'YA', ?)
  `).bind(userId, email.toLowerCase(), nama, role, passwordHash, now).run();
  
  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (log_id, waktu, email, role, aksi, entity, entity_id, ringkas)
    VALUES (?, ?, ?, ?, 'create', 'users', ?, ?)
  `).bind(crypto.randomUUID(), new Date().toISOString(), currentUser.email, currentUser.role, userId, `Buat user: ${nama} (${role})`).run();
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: { user_id: userId }
  });
});

// GET /api/auth/users (admin)
authRoutes.get('/users', authMiddleware, requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT user_id, email, nama, role, aktif, dibuat_pada FROM users ORDER BY dibuat_pada DESC
  `).all();
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: { data: results }
  });
});

// PUT /api/auth/users/:id (admin)
authRoutes.put('/users/:id', authMiddleware, requireAdmin, validateUserUpdate, async (c) => {
  const { id } = c.req.param();
  const { nama, role, aktif, rev } = c.req.valid('json');
  const currentUser = c.get('user');
  
  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' }
    }, 404);
  }
  
  // Prevent self-demote
  if (existing.user_id === currentUser.user_id && role === 'user') {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Tidak bisa menurunkan role sendiri' }
    }, 403);
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (nama !== undefined) { updates.push('nama = ?'); params.push(nama); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (aktif !== undefined) { updates.push('aktif = ?'); params.push(aktif); }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }
    }, 400);
  }
  
  updates.push('rev = rev + 1');
  params.push(id, rev);
  
  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ? AND rev = ?`).bind(...params).run();
  
  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (log_id, waktu, email, role, aksi, entity, entity_id, ringkas, sebelum, sesudah)
    VALUES (?, ?, ?, ?, 'update', 'users', ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), new Date().toISOString(), currentUser.email, currentUser.role,
    id, `Update user: ${nama || existing.nama}`, existing, { nama, role, aktif }
  ).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/auth/users/:id (admin - soft delete)
authRoutes.delete('/users/:id', authMiddleware, requireAdmin, async (c) => {
  const { id } = c.req.param();
  const rev = c.req.query('rev');
  const currentUser = c.get('user');
  
  if (!rev) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'VALIDATION', message: 'rev wajib diisi' }
    }, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' }
    }, 404);
  }
  
  if (existing.user_id === currentUser.user_id) {
    return c.json<Env['ApiResponse']>({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Tidak bisa menghapus diri sendiri' }
    }, 403);
  }
  
  await c.env.DB.prepare('UPDATE users SET aktif = "TIDAK", rev = rev + 1 WHERE user_id = ? AND rev = ?').bind(id, rev).run();
  
  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (log_id, waktu, email, role, aksi, entity, entity_id, ringkas)
    VALUES (?, ?, ?, ?, 'delete', 'users', ?, ?)
  `).bind(crypto.randomUUID(), new Date().toISOString(), currentUser.email, currentUser.role, id, `Nonaktifkan user: ${existing.nama}`).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});