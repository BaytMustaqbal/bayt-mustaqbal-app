import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Utang-Piutang keluarga — data grup, soft delete.
 * lender = yang memberi/membayari, borrower = yang berutang.
 */
export const debtRoutes = new Hono<{ Bindings: Env }>();

const toRow = (r: any) => ({
  id: r.id,
  title: r.title,
  amount: Number(r.amount) || 0,
  lenderId: r.lender_id || '',
  borrowerId: r.borrower_id || '',
  status: r.status || 'open',
  settledAt: r.settled_at || '',
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

debtRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM debts WHERE ${scope.sql} AND void IS NULL ORDER BY
       CASE WHEN status = 'open' THEN 0 ELSE 1 END,
       created_at DESC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: (rows.results || []).map(toRow), error: null });
});

debtRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { title, amount, lenderId, borrowerId } = await c.req.json().catch(() => ({})) as {
    title?: string; amount?: number; lenderId?: string; borrowerId?: string;
  };
  if (!title || !String(title).trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Keterangan wajib diisi' } }, 400);
  }
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Jumlah harus angka positif' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO debts (id, user_id, group_id, title, amount, lender_id, borrower_id, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, String(title).trim(), Number(amount), lenderId || null, borrowerId || null, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM debts WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null }, 201);
});

debtRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM debts WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Catatan utang tidak ditemukan' } }, 404);
  const { title, amount, lenderId, borrowerId, status } = await c.req.json().catch(() => ({})) as {
    title?: string; amount?: number; lenderId?: string; borrowerId?: string; status?: string;
  };
  const now = new Date().toISOString();
  const newStatus = status === 'settled' ? 'settled' : status === 'open' ? 'open' : existing.status;
  const settledAt = newStatus === 'settled' ? (existing.settled_at || now) : null;
  await c.env.DB.prepare(
    `UPDATE debts SET title = ?, amount = ?, lender_id = ?, borrower_id = ?, status = ?, settled_at = ?,
       rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(
    title !== undefined ? String(title).trim() : existing.title,
    amount != null ? Number(amount) : existing.amount,
    lenderId !== undefined ? lenderId : existing.lender_id,
    borrowerId !== undefined ? borrowerId : existing.borrower_id,
    newStatus,
    settledAt,
    now,
    id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM debts WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

debtRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id FROM debts WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Catatan utang tidak ditemukan' } }, 404);
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE debts SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id }, error: null });
});
