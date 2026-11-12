import { Hono } from 'hono';
import { hashPassword, verifyPassword, signToken, verifyToken, createSession, voidSessionByJti } from '../utils/auth';
import { logAudit } from '../utils/audit';
import { Env } from '../types/env';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Peran anggota grup: kepala_keluarga | suami | istri | anak | cucu.
const FAMILY_ROLES = ['suami', 'istri', 'anak', 'lainnya'];
const MASTER_USERNAME = 'baytmustaqbal@gmail.com';

// Grup milik master (Kakang) — anggota baru yang didaftarkan master masuk sini.
async function masterGroupId(DB: D1Database): Promise<string | null> {
  const row = await DB.prepare(
    `SELECT g.id FROM family_groups g JOIN users u ON u.id = g.owner_user_id WHERE u.username = ? LIMIT 1`
  ).bind(MASTER_USERNAME).first() as { id: string } | null;
  return row?.id ?? null;
}

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  const { username, password, nama, nickname, family_role, generasi, birth_date, group_role } = await c.req.json() as {
    username: string; password: string; nama: string;
    nickname?: string; family_role?: string; generasi?: string; birth_date?: string; group_role?: string;
  };
  if (!username || !password || !nama) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: username, password, nama' } }, 400);
  }
  // Username wajib berupa alamat email yang valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(username)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Username harus berupa alamat email yang valid' } }, 400);
  }

  // ----- Tentukan grup tujuan -----
  // Pemanggil dengan token master -> anggota baru masuk grup master (alur
  // "master mendaftarkan anggota"). Tanpa itu -> registrasi mandiri: buat grup
  // baru, pendaftar jadi kepala_keluarga grupnya sendiri (isolasi antar keluarga).
  const authHeader = c.req.header('Authorization');
  const callerToken = authHeader?.replace('Bearer ', '') || null;
  let callerIsMaster = false;
  if (callerToken) {
    const payload = verifyToken(callerToken, c.env.JWT_SECRET);
    if (payload) {
      const caller = await c.env.DB.prepare('SELECT username FROM users WHERE id = ? AND void IS NULL').bind(payload.userId).first() as any;
      callerIsMaster = caller?.username === MASTER_USERNAME;
    }
  }

  let groupId: string | null = null;
  let groupRole: string;
  if (callerIsMaster) {
    groupId = await masterGroupId(c.env.DB);
    // 'kepala_keluarga' diizinkan (Suami di keluarga) — master tetap satu-satunya
    // pemilik grup; peran ini hanya menambah hak tulis + kelola.
    const allowed: string[] = ['kepala_keluarga', 'suami', 'istri', 'anak', 'cucu'];
    groupRole = group_role && allowed.includes(group_role) ? group_role : 'anak';
  } else {
    // Registrasi mandiri: grup baru untuk pendaftar
    groupId = crypto.randomUUID();
    groupRole = 'kepala_keluarga';
  }

  // Status keluarga: suami | istri | anak | lainnya (default anak)
  const role = family_role && FAMILY_ROLES.includes(family_role) ? family_role : 'anak';
  // Unik Suami/Istri per-GRUP (bukan global) — tiap keluarga punya pasangannya.
  if ((role === 'suami' || role === 'istri') && groupId && callerIsMaster) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE group_id = ? AND family_role = ? AND void IS NULL LIMIT 1'
    ).bind(groupId, role).first();
    if (existing) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: `Sudah ada akun dengan status ${role === 'suami' ? 'Suami' : 'Istri'} di grup ini. Hanya satu yang diizinkan.` } }, 409);
    }
  }
  // Posisi silsilah: orangtua | anak | cucu
  const GENERASI = ['orangtua', 'anak', 'cucu'];
  const gen = generasi && GENERASI.includes(generasi) ? generasi : (role === 'anak' ? 'anak' : 'orangtua');
  // Tanggal lahir opsional — format ISO YYYY-MM-DD
  const birth = birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null;
  const hash = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const nick = typeof nickname === 'string' && nickname.trim() ? nickname.trim().slice(0, 40) : null;
    // Registrasi mandiri: buat grupnya sendiri dulu (nama dari nama pendaftar)
    if (!callerIsMaster && groupId) {
      await c.env.DB.prepare(
        'INSERT INTO family_groups (id, name, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(groupId, `Keluarga ${nama}`, id, now, now).run();
    }
    await c.env.DB.prepare('INSERT INTO users (id, username, password_hash, nama, nickname, role, family_role, group_id, group_role, generasi, birth_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, username, hash, nama, nick, 'user', role, groupId, groupRole, gen, birth, now, now).run();
    return c.json({ ok: true, data: { id, username, nama, nickname: nick, role: 'user', family_role: role, group_id: groupId, group_role: groupRole, generasi: gen, birth_date: birth }, error: null });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: 'Username sudah ada' } }, 409);
    }
    throw e;
  }
});

// GET /api/auth/users — daftar anggota keluarga (butuh token).
// Master account disembunyikan (hanya untuk admin/register, bukan anggota).
authRoutes.get('/users', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.nama, u.nickname, u.family_role, u.generasi, u.birth_date, u.avatar_url, u.phone, u.created_at,
            u.group_id, u.group_role, g.name AS group_name
     FROM users u LEFT JOIN family_groups g ON g.id = u.group_id
     WHERE u.void IS NULL AND u.username != '${MASTER_USERNAME}'
     ORDER BY u.created_at ASC`
  ).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json() as { username: string; password: string };
  if (!username || !password) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: username, password' } }, 400);
  }
  const user = await c.env.DB.prepare(
    `SELECT u.*, g.name AS group_name FROM users u LEFT JOIN family_groups g ON g.id = u.group_id
     WHERE u.username = ? AND u.void IS NULL`
  ).bind(username).first() as any;
  if (!user) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Username atau password salah' } }, 401);
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Username atau password salah' } }, 401);
  }
  const device = (c.req.header('User-Agent') || 'browser').slice(0, 120);
  const jti = await createSession(c.env, user.id, device);
  const token = signToken({ userId: user.id, role: user.role }, c.env.JWT_SECRET, jti);
  c.header('Set-Cookie', `token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`);
  await logAudit(c.env, user.id, user.group_id, 'login', 'users', user.id);
  return c.json({
    ok: true,
    data: {
      token,
      user: {
        id: user.id, username: user.username, nama: user.nama, nickname: user.nickname || null,
        role: user.role, family_role: user.family_role || 'anak', generasi: user.generasi || 'orangtua',
        birth_date: user.birth_date || null, avatar_url: user.avatar_url || null,
        group_id: user.group_id || null, group_role: user.group_role || 'anak', group_name: user.group_name || null,
        google_sub: user.google_sub || null,
      },
    },
    error: null,
  });
});

// POST /api/auth/logout — void sesi saat ini + bersihkan cookie.
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1] || null;
  if (token) {
    const p = verifyToken(token, c.env.JWT_SECRET);
    if (p?.jti) await voidSessionByJti(c.env, p.jti);
  }
  c.header('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  await logAudit(c.env, c.get('userId'), c.get('groupId'), 'logout', 'users', c.get('userId'));
  return c.json({ ok: true, data: null, error: null });
});

// GET /api/auth/album-verify — verifikasi identitas dari album foto.
// Dipanggil Pages Functions album (service-to-service) memakai secret bersama
// `ALBUM_API_TOKEN` di header `X-Album-Token`. Tanpa JWT user biasa.
authRoutes.get('/album-verify', async (c) => {
  const expected = c.env.ALBUM_API_TOKEN;
  if (!expected || expected.startsWith('dev-')) {
    return c.json({ ok: false, data: null, error: { code: 'ALBUM_NOT_CONFIGURED', message: 'ALBUM_API_TOKEN belum di-set' } }, 503);
  }
  const token = c.req.header('X-Album-Token');
  if (!token || token !== expected) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Token album tidak sah' } }, 403);
  }
  const email = (c.req.query('email') || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Email tidak valid' } }, 400);
  }
  const user = await c.env.DB.prepare(
    'SELECT id, username, nama, nickname, avatar_url FROM users WHERE username = ? AND void IS NULL'
  ).bind(email).first() as { id: string; username: string; nama: string; nickname: string | null; avatar_url: string | null } | null;
  if (!user) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Akun tidak ditemukan' } }, 404);
  }
  return c.json({
    ok: true,
    data: { email: user.username, nama: user.nama, nickname: user.nickname, avatar_url: user.avatar_url },
    error: null,
  });
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.nama, u.nickname, u.avatar_url, u.role, u.family_role, u.generasi, u.birth_date,
            u.phone, u.group_id, u.group_role, u.google_sub, g.name AS group_name
     FROM users u LEFT JOIN family_groups g ON g.id = u.group_id
     WHERE u.id = ? AND u.void IS NULL`
  ).bind(userId).first();
  if (!user) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } }, 404);
  }
  return c.json({ ok: true, data: user, error: null });
});

// PUT /api/auth/me — update profil sendiri (nama + tanggal lahir)
authRoutes.put('/me', async (c) => {
  const userId = c.get('userId');
  const caller = await c.env.DB.prepare('SELECT username FROM users WHERE id = ? AND void IS NULL').bind(userId).first() as any;
  const isMaster = caller?.username === MASTER_USERNAME;
  const { nama, nickname, birth_date, avatar_url, family_role, generasi, group_role, phone } = await c.req.json() as {
    nama?: string; nickname?: string | null; birth_date?: string | null; avatar_url?: string | null;
    family_role?: string; generasi?: string; group_role?: string; phone?: string | null;
  };

  const existing = await c.env.DB.prepare('SELECT id, nama, nickname, birth_date, avatar_url, family_role, generasi, group_role, group_id, phone FROM users WHERE id = ? AND void IS NULL')
    .bind(userId).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } }, 404);
  }

  // Validasi enum bila dikirim
  const FAMILY_ROLES = ['suami', 'istri', 'anak', 'lainnya'];
  const GENERASI = ['orangtua', 'anak', 'cucu'];
  const GROUP_ROLES = ['kepala_keluarga', 'suami', 'istri', 'anak', 'cucu'];
  if (family_role !== undefined && !FAMILY_ROLES.includes(family_role)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'family_role tidak valid' } }, 400);
  }
  if (generasi !== undefined && !GENERASI.includes(generasi)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'generasi tidak valid' } }, 400);
  }
  if (group_role !== undefined && !GROUP_ROLES.includes(group_role)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'group_role tidak valid' } }, 400);
  }
  // Peran grup hanya bisa diubah master (anti self-promote)
  if (group_role !== undefined && group_role !== existing.group_role && !isMaster) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Peran grup hanya bisa diubah oleh master.' } }, 403);
  }

  // Partial update: hanya field yang dikirim yang diubah (guard tipe: null/angka -> pakai nilai lama)
  const newNama = (typeof nama === 'string' && nama.trim()) ? nama.trim() : existing.nama;
  const newNick = nickname !== undefined
    ? (typeof nickname === 'string' && nickname.trim() ? nickname.trim().slice(0, 40) : null)
    : existing.nickname;
  const newBirth = birth_date !== undefined
    ? (birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null)
    : existing.birth_date;
  // Avatar: data URL hasil crop client. Batas wajar 500KB agar row tidak membengkak.
  // null -> hapus avatar; string valid -> ganti; selain itu -> pakai nilai lama.
  let newAvatar = existing.avatar_url;
  if (avatar_url !== undefined) {
    if (avatar_url === null) newAvatar = null;
    else if (typeof avatar_url === 'string' && avatar_url.length <= 500_000) newAvatar = avatar_url || null;
  }
  const newFamilyRole = family_role !== undefined ? family_role : existing.family_role;
  const newGenerasi = generasi !== undefined ? generasi : existing.generasi;
  const newGroupRole = group_role !== undefined ? group_role : existing.group_role;
  const newPhone = phone !== undefined ? (typeof phone === 'string' ? phone.trim().slice(0, 30) || null : null) : existing.phone;

  // Unik Suami/Istri per grup bila status berubah
  if ((newFamilyRole === 'suami' || newFamilyRole === 'istri') && existing.group_id && newFamilyRole !== existing.family_role) {
    const dup = await c.env.DB.prepare(
      'SELECT id FROM users WHERE group_id = ? AND family_role = ? AND void IS NULL AND id != ? LIMIT 1'
    ).bind(existing.group_id, newFamilyRole, userId).first();
    if (dup) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: `Sudah ada akun dengan status ${newFamilyRole === 'suami' ? 'Suami' : 'Istri'} di grup ini.` } }, 409);
    }
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE users SET nama = ?, nickname = ?, birth_date = ?, avatar_url = ?, family_role = ?, generasi = ?, group_role = ?, phone = ?, updated_at = ? WHERE id = ? AND void IS NULL')
    .bind(newNama, newNick, newBirth, newAvatar, newFamilyRole, newGenerasi, newGroupRole, newPhone, now, userId).run();
  await logAudit(c.env, userId, c.get('groupId'), 'update_profile', 'users', userId);

  const user = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.nama, u.nickname, u.avatar_url, u.role, u.family_role, u.generasi, u.birth_date,
            u.phone, u.group_id, u.group_role, g.name AS group_name
     FROM users u LEFT JOIN family_groups g ON g.id = u.group_id
     WHERE u.id = ? AND u.void IS NULL`
  ).bind(userId).first();
  return c.json({ ok: true, data: user, error: null });
});

// GET /api/auth/sessions — daftar sesi aktif milik user.
authRoutes.get('/sessions', async (c) => {
  const userId = c.get('userId');
  const rows = await c.env.DB.prepare(
    `SELECT id, jti, device, created_at, last_seen, expires_at
     FROM sessions WHERE user_id = ? AND void IS NULL ORDER BY created_at DESC`
  ).bind(userId).all();
  return c.json({ ok: true, data: rows.results || [], error: null });
});

// DELETE /api/auth/sessions/:id — revoke sesi lain (hanya milik user sendiri).
authRoutes.delete('/sessions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const row = (await c.env.DB.prepare(
    'SELECT id FROM sessions WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first()) as { id: string } | null;
  if (!row) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Sesi tidak ditemukan' } }, 404);
  }
  await c.env.DB.prepare('UPDATE sessions SET void = ? WHERE id = ?')
    .bind(new Date().toISOString(), id).run();
  await logAudit(c.env, userId, c.get('groupId'), 'revoke_session', 'sessions', id);
  return c.json({ ok: true, data: { id }, error: null });
});

// POST /api/auth/google/unlink — hapus pengikat google_sub (bukan hapus akun).
authRoutes.post('/google/unlink', async (c) => {
  const userId = c.get('userId');
  await c.env.DB.prepare('UPDATE users SET google_sub = NULL, updated_at = ? WHERE id = ? AND void IS NULL')
    .bind(new Date().toISOString(), userId).run();
  await logAudit(c.env, userId, c.get('groupId'), 'unlink_google', 'users', userId);
  return c.json({ ok: true, data: { google_sub: null }, error: null });
});

// PUT /api/auth/users/:id — edit data anggota oleh master (Kakang).
// Hanya master yang boleh; menyentuh profil, peran/status, dan opsional password.
authRoutes.put('/users/:id', async (c) => {
  const callerId = c.get('userId');
  const caller = await c.env.DB.prepare('SELECT username FROM users WHERE id = ? AND void IS NULL').bind(callerId).first() as any;
  if (caller?.username !== MASTER_USERNAME) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Hanya master yang bisa mengubah data anggota.' } }, 403);
  }

  const targetId = c.req.param('id');
  if (targetId === callerId) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Gunakan "Simpan Profil" untuk mengubah akun sendiri.' } }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? AND void IS NULL').bind(targetId).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Anggota tidak ditemukan' } }, 404);
  }

  const { nama, nickname, birth_date, avatar_url, family_role, generasi, group_role, password, phone } = await c.req.json() as {
    nama?: string; nickname?: string | null; birth_date?: string | null; avatar_url?: string | null;
    family_role?: string; generasi?: string; group_role?: string; password?: string; phone?: string | null;
  };

  // Validasi enum
  const FAMILY_ROLES = ['suami', 'istri', 'anak', 'lainnya'];
  const GENERASI = ['orangtua', 'anak', 'cucu'];
  const GROUP_ROLES = ['kepala_keluarga', 'suami', 'istri', 'anak', 'cucu'];
  if (family_role !== undefined && !FAMILY_ROLES.includes(family_role)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'family_role tidak valid' } }, 400);
  }
  if (generasi !== undefined && !GENERASI.includes(generasi)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'generasi tidak valid' } }, 400);
  }
  if (group_role !== undefined && !GROUP_ROLES.includes(group_role)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'group_role tidak valid' } }, 400);
  }
  if (password !== undefined && password !== '' && password.length < 6) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Password minimal 6 karakter' } }, 400);
  }

  // Unik Suami/Istri per grup
  const newRole = family_role !== undefined ? family_role : existing.family_role;
  if ((newRole === 'suami' || newRole === 'istri') && existing.group_id) {
    const dup = await c.env.DB.prepare(
      'SELECT id FROM users WHERE group_id = ? AND family_role = ? AND void IS NULL AND id != ? LIMIT 1'
    ).bind(existing.group_id, newRole, targetId).first();
    if (dup) {
      return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: `Sudah ada akun dengan status ${newRole === 'suami' ? 'Suami' : 'Istri'} di grup ini.` } }, 409);
    }
  }

  const now = new Date().toISOString();
  const newNama = (typeof nama === 'string' && nama.trim()) ? nama.trim() : existing.nama;
  const newNick = nickname !== undefined
    ? (typeof nickname === 'string' && nickname.trim() ? nickname.trim().slice(0, 40) : null)
    : existing.nickname;
  const newBirth = birth_date !== undefined
    ? (birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null)
    : existing.birth_date;
  let newAvatar = existing.avatar_url;
  if (avatar_url !== undefined) {
    if (avatar_url === null) newAvatar = null;
    else if (typeof avatar_url === 'string' && avatar_url.length <= 500_000) newAvatar = avatar_url || null;
  }
  const newFamilyRole = family_role !== undefined ? family_role : existing.family_role;
  const newGenerasi = generasi !== undefined ? generasi : existing.generasi;
  const newGroupRole = group_role !== undefined ? group_role : existing.group_role;
  const newPhone = phone !== undefined ? (typeof phone === 'string' ? phone.trim().slice(0, 30) || null : null) : existing.phone;

  const newHash = password !== undefined && password !== '' ? await hashPassword(password) : existing.password_hash;

  await c.env.DB.prepare(
    `UPDATE users SET nama = ?, nickname = ?, birth_date = ?, avatar_url = ?, family_role = ?, generasi = ?, group_role = ?, phone = ?, password_hash = ?, updated_at = ?
     WHERE id = ? AND void IS NULL`
  ).bind(newNama, newNick, newBirth, newAvatar, newFamilyRole, newGenerasi, newGroupRole, newPhone, newHash, now, targetId).run();
  await logAudit(c.env, callerId, existing.group_id, 'update_member', 'users', targetId);

  const updated = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.nama, u.nickname, u.family_role, u.generasi, u.birth_date, u.avatar_url, u.phone, u.created_at,
            u.group_id, u.group_role, g.name AS group_name
     FROM users u LEFT JOIN family_groups g ON g.id = u.group_id
     WHERE u.id = ? AND u.void IS NULL`
  ).bind(targetId).first();
  return c.json({ ok: true, data: updated, error: null });
});
