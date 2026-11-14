import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

export const serviceInvRoutes = new Hono<{ Bindings: Env }>();

const toRow = (r: any) => ({
  id: r.id,
  nama: r.nama,
  jenis: r.jenis || '',
  intervalType: r.interval_type || 'km',
  intervalValue: Number(r.interval_value) || 3000,
  lastServiceKm: Number(r.last_service_km) || 0,
  lastServiceDate: r.last_service_date || '',
  nextDue: r.next_due || '',
  notes: r.notes || '',
  vehicleId: r.vehicle_id || '',
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

// GET /api/service-inv
serviceInvRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const vehicleId = c.req.query('vehicleId') || '';
  let sql = `SELECT * FROM service_inventory WHERE ${scope.sql} AND void IS NULL`;
  const binds: string[] = [scope.val];
  if (vehicleId) {
    sql += ' AND vehicle_id = ?';
    binds.push(vehicleId);
  }
  sql += ' ORDER BY nama ASC';
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ ok: true, data: (rows.results || []).map(toRow), error: null });
});

// POST /api/service-inv
serviceInvRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { nama, jenis, intervalType, intervalValue, lastServiceKm, lastServiceDate, nextDue, notes, vehicleId } = await c.req.json() as {
    nama: string; jenis?: string; intervalType?: string; intervalValue?: number; lastServiceKm?: number;
    lastServiceDate?: string; nextDue?: string; notes?: string; vehicleId?: string;
  };
  if (!nama?.trim()) return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nama wajib diisi' } }, 400);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO service_inventory (id, user_id, group_id, nama, jenis, interval_type, interval_value, last_service_km, last_service_date, next_due, notes, vehicle_id, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, nama.trim(), jenis || null, intervalType || 'km', Number(intervalValue) || 3000, Number(lastServiceKm) || 0, lastServiceDate || null, nextDue || null, notes || null, vehicleId || null, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM service_inventory WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null });
});

// PUT /api/service-inv/:id
serviceInvRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM service_inventory WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Sparepart tidak ditemukan' } }, 404);
  const body = await c.req.json() as {
    nama?: string; jenis?: string; intervalType?: string; intervalValue?: number; lastServiceKm?: number;
    lastServiceDate?: string; nextDue?: string; notes?: string; vehicleId?: string;
  };
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE service_inventory SET nama = ?, jenis = ?, interval_type = ?, interval_value = ?, last_service_km = ?, last_service_date = ?, next_due = ?, notes = ?, vehicle_id = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(
    body.nama ?? existing.nama, body.jenis !== undefined ? body.jenis : existing.jenis,
    body.intervalType ?? existing.interval_type, body.intervalValue != null ? Number(body.intervalValue) : existing.interval_value,
    body.lastServiceKm != null ? Number(body.lastServiceKm) : existing.last_service_km,
    body.lastServiceDate !== undefined ? body.lastServiceDate : existing.last_service_date,
    body.nextDue !== undefined ? body.nextDue : existing.next_due,
    body.notes !== undefined ? body.notes : existing.notes,
    body.vehicleId !== undefined ? (body.vehicleId || null) : existing.vehicle_id,
    now, id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM service_inventory WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

// DELETE /api/service-inv/:id
serviceInvRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id FROM service_inventory WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Sparepart tidak ditemukan' } }, 404);
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE service_inventory SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id }, error: null });
});
