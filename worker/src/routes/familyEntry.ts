import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Entri Keluarga (medis/dokumen/kontak) — data grup, soft delete.
 * `bagian` = medis | dokumen | kontak.
 */
export const familyEntryRoutes = new Hono<{ Bindings: Env }>();

const BAGIAN = ['medis', 'dokumen', 'kontak'];

familyEntryRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM family_entries WHERE ${scope.sql} AND void IS NULL ORDER BY bagian, created_at`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: rows.results || [], error: null });
});

familyEntryRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const { bagian, title, meta, badge, tone } = await c.req.json().catch(() => ({})) as {
    bagian?: string; title?: string; meta?: string; badge?: string; tone?: string;
  };
  if (!bagian || !BAGIAN.includes(bagian) || !title || !String(title).trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'bagian & title wajib diisi' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO family_entries (id, user_id, group_id, bagian, title, meta, badge, tone, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, c.get('userId'), c.get('groupId'), bagian, String(title).trim(), meta || null, badge || null, tone || null, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM family_entries WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: created, error: null }, 201);
});

familyEntryRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM family_entries WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Entri tidak ditemukan' } }, 404);
  }
  const { bagian, title, meta, badge, tone } = await c.req.json().catch(() => ({})) as {
    bagian?: string; title?: string; meta?: string; badge?: string; tone?: string;
  };
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE family_entries SET bagian = ?, title = ?, meta = ?, badge = ?, tone = ?,
       rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(
    bagian && BAGIAN.includes(bagian) ? bagian : existing.bagian,
    title !== undefined ? String(title).trim() : existing.title,
    meta !== undefined ? (meta || null) : existing.meta,
    badge !== undefined ? (badge || null) : existing.badge,
    tone !== undefined ? (tone || null) : existing.tone,
    now,
    id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM family_entries WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: updated, error: null });
});

familyEntryRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM family_entries WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Entri tidak ditemukan' } }, 404);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE family_entries SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id, void: now }, error: null });
});
