import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

export const settingsRoutes = new Hono<{ Bindings: Env }>();

// GET /api/settings — list semua setting yang terlihat pemanggil
// (scope grup keluarga; jatuh ke per-user kalau belum ada grup).
settingsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);

  const results = await c.env.DB.prepare(
    `SELECT * FROM settings WHERE ${scope.sql} AND void IS NULL ORDER BY key ASC`
  ).bind(scope.val).all();

  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/settings/member-style — gaya bahasa milik sendiri (semua peran login).
// Hanya mengubah members[<userId sendiri>].style di dalam ai_prefs; persona dan
// maks. kalimat milik override dipertahankan, sisanya default keluarga.
const MBR_STYLES = new Set(['santai', 'hangat', 'formal', 'profesional']);
const intOr = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

settingsRoutes.post('/member-style', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  if (!userId) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Login diperlukan' } }, 401);
  }
  const { style } = (await c.req.json()) as { style?: string };
  const s = String(style || '').trim().toLowerCase();
  if (!MBR_STYLES.has(s)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: "Gaya bahasa harus: santai, hangat, formal, profesional" } }, 400);
  }

  const scope = groupScope(groupId, userId);
  const now = new Date().toISOString();
  const existing = (await c.env.DB.prepare(
    `SELECT id, value FROM settings WHERE key = 'ai_prefs' AND ${scope.sql} AND void IS NULL`
  ).bind(scope.val).first()) as { id: string; value: string } | null;

  let pref: any = {};
  try { pref = existing?.value ? JSON.parse(existing.value) : {}; } catch { pref = {}; }

  const chatEnabled = pref.chatEnabled !== false;
  const receiptScanEnabled = pref.receiptScanEnabled !== false;
  const summaryItems = intOr(pref.summaryItems, 1, 10, 5);
  const persona = typeof pref.persona === 'string' && pref.persona.trim() ? pref.persona.trim().slice(0, 40) : 'Neuro';
  const globalStyle = MBR_STYLES.has(String(pref.style || '').toLowerCase()) ? String(pref.style).toLowerCase() : 'santai';
  const maxSentences = intOr(pref.maxSentences, 1, 6, 3);
  const members = pref.members && typeof pref.members === 'object' ? { ...pref.members } : {};

  const prev = members[userId] && typeof members[userId] === 'object' ? members[userId] : {};
  members[userId] = {
    persona: typeof prev.persona === 'string' && prev.persona.trim() ? String(prev.persona).trim().slice(0, 40) : persona,
    style: s,
    maxSentences: intOr(prev.maxSentences, 1, 6, maxSentences),
  };

  const next = { chatEnabled, receiptScanEnabled, summaryItems, persona, style: globalStyle, maxSentences, members };
  const value = JSON.stringify(next);

  if (existing) {
    await c.env.DB.prepare('UPDATE settings SET value = ?, rev = rev + 1, updated_at = ? WHERE id = ?')
      .bind(value, now, existing.id).run();
    const updated = await c.env.DB.prepare('SELECT * FROM settings WHERE id = ?').bind(existing.id).first();
    return c.json({ ok: true, data: updated, error: null });
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO settings (id, user_id, group_id, key, value, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, groupId || null, 'ai_prefs', value, 1, now, now).run();
  return c.json({ ok: true, data: { id, key: 'ai_prefs', value, rev: 1, created_at: now, updated_at: now }, error: null });
});

// POST /api/settings - simpan setting.
// Untuk setting milik KELUARGA (gaji rencana, rasio anggaran), POST berperilaku
// upsat per-grup: kalau key yang sama sudah ada di grup, barinya diperbarui
// (bukan bikin baris dobel) supaya satu keluarga punya SATU angka.
settingsRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { key, value } = await c.req.json() as {
    key: string; value: string;
  };

  if (!key || value == null) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: key, value' } }, 400);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const scope = groupScope(groupId, userId);

  // Upsat per-grup: cari key yang sama dalam scope yang sama.
  const existing = await c.env.DB.prepare(
    `SELECT id FROM settings WHERE key = ? AND ${scope.sql} AND void IS NULL`
  ).bind(key, scope.val).first() as { id: string } | null;

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE settings SET value = ?, rev = rev + 1, updated_at = ? WHERE id = ?'
    ).bind(value, now, existing.id).run();
    const updated = await c.env.DB.prepare(
      'SELECT * FROM settings WHERE id = ?'
    ).bind(existing.id).first() as any;
    return c.json({ ok: true, data: updated, error: null });
  }

  await c.env.DB.prepare(
    'INSERT INTO settings (id, user_id, group_id, key, value, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, groupId, key, value, 1, now, now).run();

  return c.json({ ok: true, data: { id, user_id: userId, group_id: groupId, key, value, rev: 1, created_at: now, updated_at: now }, error: null });
});

// GET /api/settings/:id — detail by id
settingsRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const result = await c.env.DB.prepare(
    `SELECT * FROM settings WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Setting tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/settings/:id — update (increment rev). Butuh peran tulis.
settingsRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM settings WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Setting tidak ditemukan' } }, 404);
  }

  const { key, value } = await c.req.json() as {
    key?: string; value?: string;
  };

  if (!key || value == null) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: key, value' } }, 400);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE settings SET key = ?, value = ?, rev = rev + 1, updated_at = ? WHERE id = ?'
  ).bind(key, value, now, id).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM settings WHERE id = ? AND void IS NULL'
  ).bind(id).first() as any;

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/settings/:id — soft delete (SET void = now). Butuh peran tulis.
settingsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM settings WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Setting tidak ditemukan' } }, 404);
  }
  if (!canWriteGroup(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE settings SET void = ? WHERE id = ?'
  ).bind(now, id).run();

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
