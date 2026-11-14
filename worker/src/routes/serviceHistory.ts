import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Riwayat Service kendaraan — data grup, soft delete.
 * items = array JSON [{ sparepartId, sparepartNama, qty, price }].
 */
export const serviceHistoryRoutes = new Hono<{ Bindings: Env }>();

const toRow = (r: any) => ({
  id: r.id,
  tanggal: r.tanggal,
  odometer: Number(r.odometer) || 0,
  items: (() => { try { return JSON.parse(r.items || '[]'); } catch { return []; } })(),
  total: Number(r.total) || 0,
  technician: r.technician || '',
  notes: r.notes || '',
  vehicleId: r.vehicle_id || '',
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

serviceHistoryRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const vehicleId = c.req.query('vehicleId') || '';
  let sql = `SELECT * FROM service_history WHERE ${scope.sql} AND void IS NULL`;
  const binds: string[] = [scope.val];
  if (vehicleId) {
    sql += ' AND vehicle_id = ?';
    binds.push(vehicleId);
  }
  sql += ' ORDER BY tanggal DESC, created_at DESC';
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ ok: true, data: (rows.results || []).map(toRow), error: null });
});

serviceHistoryRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { tanggal, odometer, items, total, technician, notes, vehicleId } = await c.req.json().catch(() => ({})) as {
    tanggal?: string; odometer?: number; items?: string; total?: number; technician?: string; notes?: string; vehicleId?: string;
  };
  if (!tanggal) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Tanggal wajib diisi' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO service_history (id, user_id, group_id, tanggal, odometer, items, total, technician, notes, vehicle_id, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, tanggal, Number(odometer) || 0, items || null, Number(total) || 0, technician || null, notes || null, vehicleId || null, now, now).run();
  // Odometer kendaraan ikut naik mengikuti catatan service (maksimum).
  if (vehicleId && Number(odometer) > 0) {
    await c.env.DB.prepare(
      'UPDATE vehicles SET odometer = MAX(odometer, ?), updated_at = ? WHERE id = ?'
    ).bind(Number(odometer), now, vehicleId).run();
  }
  const created = await c.env.DB.prepare('SELECT * FROM service_history WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null }, 201);
});

serviceHistoryRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM service_history WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Riwayat tidak ditemukan' } }, 404);
  const { tanggal, odometer, items, total, technician, notes, vehicleId } = await c.req.json() as {
    tanggal?: string; odometer?: number; items?: string; total?: number; technician?: string; notes?: string; vehicleId?: string;
  };
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE service_history SET tanggal = ?, odometer = ?, items = ?, total = ?, technician = ?, notes = ?, vehicle_id = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(
    tanggal ?? existing.tanggal, odometer != null ? Number(odometer) : existing.odometer,
    items !== undefined ? items : existing.items, total != null ? Number(total) : existing.total,
    technician !== undefined ? technician : existing.technician, notes !== undefined ? notes : existing.notes,
    vehicleId !== undefined ? (vehicleId || null) : existing.vehicle_id,
    now, id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM service_history WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

serviceHistoryRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id FROM service_history WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Riwayat tidak ditemukan' } }, 404);
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE service_history SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id }, error: null });
});
