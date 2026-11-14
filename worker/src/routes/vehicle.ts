import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Kendaraan — data grup, soft delete.
 * Dipilih saat mencatat service / perawatan; odometer otomatis diperbarui
 * oleh catatan service terakhir.
 */
export const vehicleRoutes = new Hono<{ Bindings: Env }>();

const toRow = (r: any) => ({
  id: r.id,
  nama: r.nama,
  jenis: r.jenis || '',
  merek: r.merek || '',
  plat: r.plat || '',
  odometer: Number(r.odometer) || 0,
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

vehicleRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM vehicles WHERE ${scope.sql} AND void IS NULL ORDER BY nama ASC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: (rows.results || []).map(toRow), error: null });
});

vehicleRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { nama, jenis, merek, plat, odometer } = await c.req.json().catch(() => ({})) as {
    nama?: string; jenis?: string; merek?: string; plat?: string; odometer?: number;
  };
  if (!nama || !String(nama).trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nama kendaraan wajib diisi' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO vehicles (id, user_id, group_id, nama, jenis, merek, plat, odometer, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, String(nama).trim(), jenis || null, merek || null, plat || null, Number(odometer) || 0, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null }, 201);
});

vehicleRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM vehicles WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Kendaraan tidak ditemukan' } }, 404);
  const { nama, jenis, merek, plat, odometer } = await c.req.json().catch(() => ({})) as {
    nama?: string; jenis?: string; merek?: string; plat?: string; odometer?: number;
  };
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE vehicles SET nama = ?, jenis = ?, merek = ?, plat = ?, odometer = ?, rev = rev + 1, updated_at = ?
     WHERE id = ?`
  ).bind(
    nama !== undefined ? String(nama).trim() : existing.nama,
    jenis !== undefined ? (jenis || null) : existing.jenis,
    merek !== undefined ? (merek || null) : existing.merek,
    plat !== undefined ? (plat || null) : existing.plat,
    odometer != null ? Number(odometer) : existing.odometer,
    now,
    id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

vehicleRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id FROM vehicles WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Kendaraan tidak ditemukan' } }, 404);
  const now = new Date().toISOString();
  // Soft delete kendaraan; inventaris/riwayat tetap ada (tidak ikut terhapus).
  await c.env.DB.prepare('UPDATE vehicles SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id }, error: null });
});
