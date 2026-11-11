import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';
import {
  MAX_PHOTO_BYTES,
  buildPhotoKey,
  deleteMomentPhoto,
  extractPhotoKey,
  getMomentPhoto,
  isValidPhotoKey,
  putMomentPhoto,
  signPhotoKey,
  verifyPhotoSignature,
} from '../utils/storage';

// Daftar kategori momen yang tetap (sinkron dengan frontend).
export const MOMENT_CATEGORIES = [
  'kuliner',
  'wisata',
  'ibadah',
  'acara_keluarga',
  'kegiatan_rumah',
  'lainnya',
];

/**
 * URL absolut foto. Foto disimpan di R2 dan disajikan lewat route Worker
 * sendiri (bukan r2.dev publik) supaya bucket tak perlu dibuat publik.
 * Origin diambil dari request agar sama di produksi maupun dev lokal.
 */
function photoOrigin(c: { req: { url: string } }): string {
  try {
    return new URL(c.req.url).origin;
  } catch {
    return 'https://api.baytmustaqbal.my.id';
  }
}

export const momentRoutes = new Hono<{ Bindings: Env }>();

// GET /api/moment — list momen (urutan tanggal terbaru dulu)
momentRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const results = await c.env.DB.prepare(
    `SELECT * FROM family_moments WHERE ${scope.sql} AND void IS NULL ORDER BY date DESC, created_at DESC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// GET /api/moment/:id — detail by id
momentRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const result = await c.env.DB.prepare(
    `SELECT * FROM family_moments WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Momen tidak ditemukan' } }, 404);
  }
  return c.json({ ok: true, data: result, error: null });
});

// POST /api/moment — create momen. Butuh peran tulis.
momentRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { title, description, date, location, category, photo_url } = await c.req.json() as {
    title: string; description?: string; date: string; location?: string;
    category?: string; photo_url?: string;
  };

  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const cat = category && MOMENT_CATEGORIES.includes(category) ? category : 'lainnya';
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO family_moments (id, user_id, group_id, title, description, date, location, category, photo_url, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, groupId, title, description || null, date, location || null, cat, photo_url || null, 1, now, now).run();

  const created = await c.env.DB.prepare(
    'SELECT * FROM family_moments WHERE id = ?'
  ).bind(id).first();

  return c.json({ ok: true, data: created, error: null });
});

// POST /api/moment/upload — unggah foto momen ke R2, balikan URL absolut.
momentRoutes.post('/upload', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const form = await c.req.formData();
  const file = form.get('photo') as File | null;
  if (!file || typeof file === 'string') {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Butuh field file "photo"' } }, 400);
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Foto maksimal 5MB' } }, 400);
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const key = buildPhotoKey(ext);
  try {
    await putMomentPhoto(
      c.env,
      key,
      await file.arrayBuffer(),
      file.type || 'image/jpeg'
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ ok: false, data: null, error: { code: 'PHOTO_UPLOAD_FAILED', message: msg } }, 502);
  }

  const sig = await signPhotoKey(c.env, key);
  return c.json({
    ok: true,
    data: { photo_url: `${photoOrigin(c)}/api/moment/photo/${key}?sig=${sig}` },
    error: null,
  });
});

// GET /api/moment/photo/:key — sajikan foto dari R2.
// Route ini TIDAK lewat auth middleware (lihat middleware/auth.ts): <img src>
// tak bisa mengirim header Authorization. Akses dijaga tanda tangan HMAC di
// query string, jadi URL foto hanya sah kalau ditandatangani worker.
momentRoutes.get('/photo/:key', async (c) => {
  const key = c.req.param('key');
  if (!isValidPhotoKey(key)) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Foto tidak ditemukan' } }, 404);
  }
  const sig = c.req.query('sig');
  if (!(await verifyPhotoSignature(c.env, key, sig))) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Akses foto tidak sah' } }, 403);
  }
  const object = await getMomentPhoto(c.env, key);
  if (!object) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Foto tidak ditemukan' } }, 404);
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});

// PUT /api/moment/:id — update (increment rev). Butuh peran tulis.
momentRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM family_moments WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Momen tidak ditemukan' } }, 404);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const { title, description, date, location, category, photo_url } = await c.req.json() as {
    title?: string; description?: string; date?: string; location?: string;
    category?: string; photo_url?: string;
  };
  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }
  const cat = category && MOMENT_CATEGORIES.includes(category) ? category : 'lainnya';
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE family_moments SET title = ?, description = ?, date = ?, location = ?, category = ?, photo_url = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(title, description || null, date, location || null, cat, photo_url || null, now, id).run();

  // Foto diganti → objek lama di R2 jadi sia-sia, hapus biar bucket tak menumpuk.
  const oldKey = extractPhotoKey(existing.photo_url);
  const newKey = extractPhotoKey(photo_url);
  if (oldKey && oldKey !== newKey) {
    await deleteMomentPhoto(c.env, oldKey);
  }

  const updated = await c.env.DB.prepare(
    'SELECT * FROM family_moments WHERE id = ? AND void IS NULL'
  ).bind(id).first() as any;
  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/moment/:id — soft delete (SET void = now). Butuh peran tulis.
momentRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM family_moments WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Momen tidak ditemukan' } }, 404);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE family_moments SET void = ? WHERE id = ?'
  ).bind(now, id).run();
  return c.json({ ok: true, data: { id, void: now }, error: null });
});
