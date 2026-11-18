import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';
import { syncToGcal } from '../utils/gcal';

export const calRoutes = new Hono<{ Bindings: Env }>();

// Aturan anggota agenda: 'keluarga'/kosong = agenda bersama (hanya peran tulis);
// user_id anggota → pemilik boleh tulis miliknya sendiri, peran tulis boleh semua.
// Mengembalikan { ok: boolean, status?: number, message?: string }.
async function memberTargetOk(
  c: any,
  memberId: string | null | undefined,
): Promise<{ ok: boolean; status?: 400 | 403; message?: string }> {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const canWrite = canWriteGroup(c.get('groupRole'));
  const mid = String(memberId || '').trim();
  const isKeluarga = !mid || mid.toLowerCase() === 'keluarga';
  if (isKeluarga) {
    return canWrite
      ? { ok: true }
      : { ok: false, status: 403, message: 'Agenda keluarga hanya bisa diisi kepala keluarga, suami, istri.' };
  }
  // member_id harus user dalam grup yang sama (bila grup dipakai)
  const scopeSql = groupId ? 'group_id = ?' : '1=1';
  const target = await c.env.DB.prepare(
    `SELECT id FROM users WHERE id = ? AND void IS NULL AND ${scopeSql}`
  ).bind(mid, ...(groupId ? [groupId] : [])).first() as { id: string } | null;
  if (!target) return { ok: false, status: 400, message: 'Anggota tidak ditemukan di keluarga ini.' };
  if (canWrite || mid === userId) return { ok: true };
  return { ok: false, status: 403, message: 'Anda hanya bisa mengisi agenda milik Anda sendiri.' };
}

// Bolehkah mengubah/menghapus baris agenda ini? Peran tulis boleh semua;
// selain itu hanya agenda dengan member_id = miliknya sendiri.
function canEditCalRow(c: any, row: any): boolean {
  if (canWriteGroup(c.get('groupRole'))) return true;
  const mid = String(row?.member_id || '').trim();
  return !!mid && mid === c.get('userId');
}

// GET /api/cal — list calendar events (ordered by date DESC)
// Scope: data Grup Keluarga (semua anggota lihat data yang sama).
calRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const results = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE ${scope.sql} AND void IS NULL ORDER BY date DESC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// POST /api/cal — create calendar event. user_id = penulis; group_id = pemilik data.
calRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { id: clientId, title, date, time, category, member_id, description } = await c.req.json() as {
    id?: string; title: string; date: string; time?: string; category?: string; member_id?: string; description?: string;
  };

  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }
  const m = await memberTargetOk(c, member_id);
  if (!m.ok) {
    return c.json({ ok: false, data: null, error: { code: m.status === 403 ? 'FORBIDDEN' : 'VALIDATION', message: m.message } }, m.status || 400);
  }
  const midNorm = String(member_id || '').trim();
  const memberStore = !midNorm || midNorm.toLowerCase() === 'keluarga' ? null : midNorm;

  const id = typeof clientId === 'string' && /^[0-9a-zA-Z_-]{8,64}$/.test(clientId) ? clientId : crypto.randomUUID();
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (existing) {
    return c.json({ ok: true, data: existing, error: null });
  }

  const now = new Date().toISOString();
  const inserted = await c.env.DB.prepare(
    'INSERT INTO calendar_events (id, user_id, group_id, title, date, time, category, member_id, description, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING'
  ).bind(id, userId, groupId, title, date, time || null, category || null, memberStore, description || null, 1, now, now).run();

  if (inserted.meta.changes === 0) {
    const row = await c.env.DB.prepare('SELECT * FROM calendar_events WHERE id = ?').bind(id).first() as any;
    if (row) return c.json({ ok: true, data: row, error: null });
    return c.json({ ok: false, data: null, error: { code: 'CONFLICT', message: 'ID agenda sudah dipakai' } }, 409);
  }

  // Sinkron ke Google Calendar (diam-diam; gagal? cron yang ulang)
  await syncToGcal(c.env, { writerUserId: userId, groupId, entityType: 'cal', entityId: id, action: 'upsert' });

  const created = await c.env.DB.prepare('SELECT * FROM calendar_events WHERE id = ?').bind(id).first() as any;
  return c.json({ ok: true, data: created, error: null });
});

// GET /api/cal/:id — detail by id
calRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const result = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});

// PUT /api/cal/:id — update (increment rev). Butuh peran tulis.
calRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }

  const { title, date, time, category, member_id, description } = await c.req.json() as {
    title?: string; date?: string; time?: string; category?: string; member_id?: string; description?: string;
  };

  if (!title || !date) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: title, date' } }, 400);
  }
  if (!canEditCalRow(c, existing)) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Anda hanya bisa mengubah agenda milik Anda sendiri, atau agenda bersama (kepala keluarga, suami, istri).' } }, 403);
  }
  const m = await memberTargetOk(c, member_id);
  if (!m.ok) {
    return c.json({ ok: false, data: null, error: { code: m.status === 403 ? 'FORBIDDEN' : 'VALIDATION', message: m.message } }, m.status || 400);
  }
  const midNorm = String(member_id || '').trim();
  const memberStore = !midNorm || midNorm.toLowerCase() === 'keluarga' ? null : midNorm;

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE calendar_events SET title = ?, date = ?, time = ?, category = ?, member_id = ?, description = ?, rev = rev + 1, updated_at = ? WHERE id = ?'
  ).bind(title, date, time || null, category || null, memberStore, description || null, now, id).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND void IS NULL'
  ).bind(id).first() as any;

  await syncToGcal(c.env, { writerUserId: userId, groupId, entityType: 'cal', entityId: id, action: 'upsert' });

  return c.json({ ok: true, data: updated, error: null });
});

// DELETE /api/cal/:id — soft delete (SET void = now). Butuh peran tulis.
calRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');

  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;

  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Calendar event tidak ditemukan' } }, 404);
  }
  if (!canEditCalRow(c, existing)) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Anda hanya bisa menghapus agenda milik Anda sendiri, atau agenda bersama (kepala keluarga, suami, istri).' } }, 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE calendar_events SET void = ? WHERE id = ?'
  ).bind(now, id).run();

  await syncToGcal(c.env, { writerUserId: userId, groupId, entityType: 'cal', entityId: id, action: 'delete' });

  return c.json({ ok: true, data: { id, void: now }, error: null });
});
