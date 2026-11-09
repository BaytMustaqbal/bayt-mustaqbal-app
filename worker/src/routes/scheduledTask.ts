import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

// Jenis tugas terjadwal (sinkron dengan 4 tab frontend).
export const SCHEDULED_TYPES = ['pengeluaran', 'tabungan', 'belanja', 'service'];

// CRUD Tugas Terjadwal (4 tab) — sumber data untuk notif WA H-3 oleh cron.
export const scheduledTaskRoutes = new Hono<{ Bindings: Env }>();

const toRow = (r: any) => ({
  id: r.id,
  type: r.type,
  name: r.name,
  amount: r.amount != null ? Number(r.amount) : null,
  day: r.day != null ? Number(r.day) : null,
  next_due: r.next_due || null,
  active: r.active === 1,
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

// GET /api/rec/scheduled — list tugas terjadwal (scope grup/user).
scheduledTaskRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const results = await c.env.DB.prepare(
    `SELECT * FROM scheduled_tasks WHERE ${scope.sql} AND void IS NULL ORDER BY type ASC, next_due ASC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: (results.results || []).map(toRow), error: null });
});

// POST /api/rec/scheduled — buat tugas terjadwal.
scheduledTaskRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);

  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { type, name, amount, day, next_due, active } = await c.req.json() as {
    type: string; name: string; amount?: number; day?: number; next_due?: string; active?: boolean;
  };

  if (!SCHEDULED_TYPES.includes(type) || !name?.trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field wajib: type (valid), name' } }, 400);
  }
  if (type === 'pengeluaran' && !(typeof day === 'number' && day >= 1 && day <= 31)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Pengeluaran terjadwal butuh day (1-31)' } }, 400);
  }
  if (type !== 'pengeluaran' && !next_due) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Jenis ini butuh next_due (tanggal jatuh tempo)' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO scheduled_tasks (id, user_id, group_id, type, name, amount, day, next_due, active, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, groupId, type, name.trim(), amount != null ? amount : null, day != null ? day : null, next_due || null, active === false ? 0 : 1, 1, now, now).run();

  const created = await c.env.DB.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null });
});

// PUT /api/rec/scheduled/:id — ubah tugas terjadwal.
scheduledTaskRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);

  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM scheduled_tasks WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Tugas terjadwal tidak ditemukan' } }, 404);
  }

  const { type, name, amount, day, next_due, active } = await c.req.json() as {
    type?: string; name?: string; amount?: number; day?: number; next_due?: string; active?: boolean;
  };
  const newType = type && SCHEDULED_TYPES.includes(type) ? type : existing.type;
  if (type && !SCHEDULED_TYPES.includes(type)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'type tidak valid' } }, 400);
  }
  if (name !== undefined && !name.trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'name tidak boleh kosong' } }, 400);
  }
  if (newType === 'pengeluaran' && day !== undefined && !(day >= 1 && day <= 31)) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'day harus 1-31' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE scheduled_tasks SET type = ?, name = ?, amount = ?, day = ?, next_due = ?, active = ?, rev = rev + 1, updated_at = ?
     WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(
    newType,
    name !== undefined ? name.trim() : existing.name,
    amount !== undefined ? amount : existing.amount,
    day !== undefined ? day : existing.day,
    next_due !== undefined ? next_due : existing.next_due,
    active !== undefined ? (active === false ? 0 : 1) : existing.active,
    now, id, scope.val
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

// DELETE /api/rec/scheduled/:id — soft delete.
scheduledTaskRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);

  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM scheduled_tasks WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Tugas terjadwal tidak ditemukan' } }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE scheduled_tasks SET void = ?, updated_at = ? WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(now, now, id, scope.val).run();
  return c.json({ ok: true, data: { id, void: now }, error: null });
});
