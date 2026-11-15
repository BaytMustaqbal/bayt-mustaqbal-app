import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Dompet/Rekening anggota — data grup, soft delete.
 */
export const accountRoutes = new Hono<{ Bindings: Env }>();

const toRow = (r: any) => ({
  id: r.id,
  user_id: r.user_id,
  nama: r.nama,
  bank: r.bank || '',
  no_rek: r.no_rek || '',
  saldo: Number(r.saldo) || 0,
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

accountRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM accounts WHERE ${scope.sql} AND void IS NULL ORDER BY nama ASC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: (rows.results || []).map(toRow), error: null });
});

accountRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const { nama, bank, noRek, saldo } = await c.req.json().catch(() => ({})) as {
    nama?: string; bank?: string; noRek?: string; saldo?: number;
  };
  if (!nama?.trim()) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nama dompet wajib diisi' } }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO accounts (id, user_id, group_id, nama, bank, no_rek, saldo, rev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, userId, groupId, String(nama).trim(), bank || null, noRek || null, Number(saldo) || 0, now, now).run();
  const created = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null }, 201);
});

accountRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);
  const existing = await c.env.DB.prepare(
    `SELECT * FROM accounts WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Dompet tidak ditemukan' } }, 404);
  const isOwner = existing.user_id === userId;
  const isKepala = c.get('groupRole') === 'kepala_keluarga';
  if (!isOwner && !isKepala) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Hanya pemilik atau kepala keluarga yang bisa mengubah dompet ini' } }, 403);
  }
  const { nama, bank, noRek, saldo } = await c.req.json().catch(() => ({})) as {
    nama?: string; bank?: string; noRek?: string; saldo?: number;
  };
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE accounts SET nama = ?, bank = ?, no_rek = ?, saldo = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(
    nama !== undefined ? String(nama).trim() : existing.nama,
    bank !== undefined ? (bank || null) : existing.bank,
    noRek !== undefined ? (noRek || null) : existing.no_rek,
    saldo != null ? Number(saldo) : existing.saldo,
    now, id
  ).run();
  const updated = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

accountRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id FROM accounts WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!existing) return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Dompet tidak ditemukan' } }, 404);
  const isOwner = existing.user_id === userId;
  const isKepala = c.get('groupRole') === 'kepala_keluarga';
  if (!isOwner && !isKepala) {
    return c.json({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Hanya pemilik atau kepala keluarga yang bisa menghapus dompet ini' } }, 403);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE accounts SET void = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  return c.json({ ok: true, data: { id }, error: null });
});

/** Transfer antar dompet dalam grup. */
accountRoutes.post('/transfer', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const { fromAccountId, toAccountId, amount, note } = await c.req.json().catch(() => ({})) as {
    fromAccountId?: string; toAccountId?: string; amount?: number; note?: string;
  };
  const amt = Number(amount) || 0;
  if (!fromAccountId || !toAccountId || amt <= 0) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'fromAccountId, toAccountId & amount wajib diisi (>0)' } }, 400);
  }
  if (fromAccountId === toAccountId) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Dompet asal & tujuan harus berbeda' } }, 400);
  }
  const from = await c.env.DB.prepare(`SELECT * FROM accounts WHERE id = ? AND ${scope.sql} AND void IS NULL`).bind(fromAccountId, scope.val).first() as any;
  const to = await c.env.DB.prepare(`SELECT * FROM accounts WHERE id = ? AND ${scope.sql} AND void IS NULL`).bind(toAccountId, scope.val).first() as any;
  if (!from || !to) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Dompet tidak ditemukan' } }, 404);
  }
  if (Number(from.saldo) < amt) {
    return c.json({ ok: false, data: null, error: { code: 'INSUFFICIENT', message: 'Saldo dompet asal tidak cukup' } }, 400);
  }
  const now = new Date().toISOString();
  const cleanNote = typeof note === 'string' ? note.trim().slice(0, 200) : '';
  const descOut = `Transfer ke ${to.nama}${cleanNote ? ' · ' + cleanNote : ''}`.slice(0, 500);
  const descIn = `Transfer dari ${from.nama}${cleanNote ? ' · ' + cleanNote : ''}`.slice(0, 500);
  const outId = crypto.randomUUID();
  const inId = crypto.randomUUID();
  const today = now.slice(0, 10);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE accounts SET saldo = saldo - ?, updated_at = ?, rev = rev + 1 WHERE id = ?').bind(amt, now, fromAccountId),
    c.env.DB.prepare('UPDATE accounts SET saldo = saldo + ?, updated_at = ?, rev = rev + 1 WHERE id = ?').bind(amt, now, toAccountId),
    // Riwayat: dua transaksi berpasangan, kategori sistem 'transfer'
    c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, group_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
    ).bind(outId, userId, groupId, 'transfer', fromAccountId, amt, 'out', today, descOut, now, now),
    c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, group_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
    ).bind(inId, userId, groupId, 'transfer', toAccountId, amt, 'in', today, descIn, now, now),
  ]);
  return c.json({ ok: true, data: { fromAccountId, toAccountId, amount: amt, note: note || null, outId, inId }, error: null });
});
