import { Hono } from 'hono';
import { Env } from '../types/env';
import { canWriteGroup, forbiddenWrite, groupScope } from '../utils/group';

/**
 * Route Transaksi Berulang - kebutuhan berkala yang tanggalnya lahir dari
 * kejadian (token listrik habis, gas LPG habis), bukan tanggal pasti.
 *
 * Template menyimpan `keyword` untuk mencocokkan deskripsi transaksi,
 * `interval_days` hasil hitung dari 3 pembelian terakhir, `last_date`, dan
 * `next_due` sebagai perkiraan tanggal habis berikutnya.
 */
export const recurringTxnRoutes = new Hono<{ Bindings: Env }>();

const HISTORY_LIMIT = 3;
const TXN_TYPES = ['pengeluaran', 'service'];

const toRow = (r: any) => ({
  id: r.id,
  type: r.type === 'service' ? 'service' : 'pengeluaran',
  nama: r.nama,
  keyword: r.keyword,
  amount: Number(r.amount) || 0,
  categoryId: r.category_id || '',
  accountId: r.account_id || '',
  vehicleId: r.vehicle_id || '',
  serviceCategory: r.service_category || '',
  intervalDays: r.interval_days == null ? null : Number(r.interval_days),
  lastDate: r.last_date || '',
  nextDue: r.next_due || '',
  active: Number(r.active) !== 0,
  notes: r.notes || '',
  rev: r.rev,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Tanggal hari ini WIB (YYYY-MM-DD). */
const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** Ambil N transaksi pengeluaran terakhir yang deskripsinya memuat keyword. */
async function recentMatches(
  db: D1Database,
  scope: { sql: string; val: string },
  keyword: string,
  limit: number
) {
  const rows = await db.prepare(
    `SELECT id, date, amount, description FROM transactions
     WHERE ${scope.sql} AND void IS NULL AND type = 'out'
       AND lower(COALESCE(description, '')) LIKE ?
     ORDER BY date DESC, created_at DESC
     LIMIT ?`
  ).bind(scope.val, `%${keyword.toLowerCase()}%`, limit).all();
  return (rows.results || []) as { id: string; date: string; amount: number; description: string }[];
}

/** Ambil N riwayat service terakhir untuk kendaraan + keyword yang sama. */
async function recentServiceMatches(
  db: D1Database,
  scope: { sql: string; val: string },
  keyword: string,
  vehicleId: string | null,
  limit: number
) {
  const vehicleClause = vehicleId ? 'AND vehicle_id = ?' : '';
  const stmt = db.prepare(
    `SELECT id, tanggal AS date, total AS amount, items AS description FROM service_history
     WHERE ${scope.sql} AND void IS NULL
       AND lower(COALESCE(items, '')) LIKE ? ${vehicleClause}
     ORDER BY tanggal DESC, created_at DESC
     LIMIT ?`
  );
  const rows = vehicleId
    ? await stmt.bind(scope.val, `%${keyword.toLowerCase()}%`, vehicleId, limit).all()
    : await stmt.bind(scope.val, `%${keyword.toLowerCase()}%`, limit).all();
  return (rows.results || []) as { id: string; date: string; amount: number; description: string }[];
}

/** Interval rata-rata (hari, dibulatkan) dari selisih tanggal berurutan. */
function averageInterval(datesDesc: string[]): number | null {
  const dates = datesDesc.map((d) => String(d).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (dates.length < 2) return null;
  let total = 0;
  for (let i = 0; i < dates.length - 1; i++) {
    const a = new Date(`${dates[i]}T00:00:00Z`).getTime();
    const b = new Date(`${dates[i + 1]}T00:00:00Z`).getTime();
    total += Math.abs(a - b) / 86400000;
  }
  const avg = Math.round(total / (dates.length - 1));
  return avg > 0 ? avg : null;
}

// GET /api/recurring - daftar template + perkiraan
recurringTxnRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM recurring_txns WHERE ${scope.sql} AND void IS NULL ORDER BY active DESC, next_due ASC`
  ).bind(scope.val).all();
  return c.json({ ok: true, data: (rows.results || []).map(toRow), error: null });
});

// POST /api/recurring - buat template
recurringTxnRoutes.post('/', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const body = await c.req.json() as {
    type?: string; nama?: string; keyword?: string; amount?: number; categoryId?: string; accountId?: string;
    vehicleId?: string; serviceCategory?: string; notes?: string;
  };
  const nama = String(body.nama || '').trim();
  const keyword = String(body.keyword || '').trim().toLowerCase();
  const type = TXN_TYPES.includes(String(body.type)) ? String(body.type) : 'pengeluaran';
  if (!nama || !keyword) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nama dan keyword wajib diisi' } }, 400);
  }
  if (type === 'service' && !body.vehicleId) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Kendaraan wajib dipilih untuk tipe service' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO recurring_txns (id, user_id, group_id, type, nama, keyword, amount, category_id, account_id, vehicle_id, service_category, interval_days, last_date, next_due, active, notes, rev, created_at, updated_at, void)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 1, ?, 1, ?, ?, NULL)`
  ).bind(
    id, userId, groupId, type, nama, keyword, Math.abs(Number(body.amount) || 0),
    body.categoryId || null, body.accountId || null,
    type === 'service' ? body.vehicleId : null,
    type === 'service' ? (body.serviceCategory || 'service') : null,
    body.notes || null, now, now
  ).run();

  const created = await c.env.DB.prepare('SELECT * FROM recurring_txns WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(created), error: null });
});

// PUT /api/recurring/:id - ubah template
recurringTxnRoutes.put('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM recurring_txns WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Template tidak ditemukan' } }, 404);
  }

  const body = await c.req.json() as {
    type?: string; nama?: string; keyword?: string; amount?: number; categoryId?: string; accountId?: string;
    vehicleId?: string; serviceCategory?: string; notes?: string; active?: boolean;
  };
  const nama = body.nama !== undefined ? String(body.nama).trim() : existing.nama;
  const keyword = body.keyword !== undefined ? String(body.keyword).trim().toLowerCase() : existing.keyword;
  const type = body.type !== undefined
    ? (TXN_TYPES.includes(String(body.type)) ? String(body.type) : 'pengeluaran')
    : (existing.type === 'service' ? 'service' : 'pengeluaran');
  if (!nama || !keyword) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nama dan keyword wajib diisi' } }, 400);
  }
  const vehicleId = body.vehicleId !== undefined ? (body.vehicleId || null) : existing.vehicle_id;
  if (type === 'service' && !vehicleId) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Kendaraan wajib dipilih untuk tipe service' } }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE recurring_txns SET type = ?, nama = ?, keyword = ?, amount = ?, category_id = ?, account_id = ?, vehicle_id = ?, service_category = ?, notes = ?, active = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(
    type, nama, keyword,
    body.amount != null ? Math.abs(Number(body.amount)) : existing.amount,
    body.categoryId !== undefined ? (body.categoryId || null) : existing.category_id,
    body.accountId !== undefined ? (body.accountId || null) : existing.account_id,
    type === 'service' ? vehicleId : null,
    type === 'service'
      ? (body.serviceCategory !== undefined ? (body.serviceCategory || 'service') : (existing.service_category || 'service'))
      : null,
    body.notes !== undefined ? (body.notes || null) : existing.notes,
    body.active === undefined ? existing.active : (body.active ? 1 : 0),
    now, id
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM recurring_txns WHERE id = ?').bind(id).first();
  return c.json({ ok: true, data: toRow(updated), error: null });
});

// DELETE /api/recurring/:id - soft delete
recurringTxnRoutes.delete('/:id', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id FROM recurring_txns WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first();
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Template tidak ditemukan' } }, 404);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE recurring_txns SET void = ? WHERE id = ?').bind(now, id).run();
  return c.json({ ok: true, data: { id, void: now }, error: null });
});

// POST /api/recurring/:id/purchase - catat pembelian + hitung ulang jadwal
recurringTxnRoutes.post('/:id/purchase', async (c) => {
  if (!canWriteGroup(c.get('groupRole'))) return c.json(forbiddenWrite(), 403);
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT * FROM recurring_txns WHERE id = ? AND ${scope.sql} AND void IS NULL`
  ).bind(id, scope.val).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Template tidak ditemukan' } }, 404);
  }

  const body = await c.req.json().catch(() => ({})) as {
    amount?: number; date?: string; description?: string; accountId?: string;
    vehicleId?: string; odometer?: number; alsoExpense?: boolean;
  };
  const amount = Math.abs(Number(body.amount) || Number(existing.amount) || 0);
  if (amount <= 0) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Nominal wajib lebih dari 0' } }, 400);
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? String(body.date) : todayWib();
  const description = String(body.description || '').trim() || existing.nama;
  const isService = existing.type === 'service';

  // Dompet opsional: hanya boleh milik sendiri. `null` eksplisit = tanpa dompet.
  let accountId = body.accountId !== undefined ? (body.accountId || null) : (existing.account_id || null);
  if (accountId) {
    const owned = await c.env.DB.prepare(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ? AND void IS NULL'
    ).bind(accountId, userId).first();
    if (!owned) accountId = null;
  }

  const now = new Date().toISOString();
  const batch: any[] = [];
  let txnId: string | null = null;
  let serviceHistoryId: string | null = null;
  let history: { id: string; date: string }[] = [];

  if (isService) {
    const vehicleId = body.vehicleId || existing.vehicle_id || null;
    if (!vehicleId) {
      return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Kendaraan wajib dipilih untuk tipe service' } }, 400);
    }
    serviceHistoryId = crypto.randomUUID();
    batch.push(c.env.DB.prepare(
      `INSERT INTO service_history (id, user_id, group_id, tanggal, odometer, items, total, technician, notes, vehicle_id, kategori, rev, created_at, updated_at, void)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?, NULL)`
    ).bind(
      serviceHistoryId, userId, groupId, date, Math.abs(Number(body.odometer) || 0), description,
      amount, existing.notes || null, vehicleId, existing.service_category || 'service', now, now
    ));

    // Catat juga sebagai pengeluaran (default aktif).
    if (body.alsoExpense !== false) {
      txnId = crypto.randomUUID();
      batch.push(c.env.DB.prepare(
        `INSERT INTO transactions (id, user_id, group_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'out', ?, ?, 1, ?, ?)`
      ).bind(txnId, userId, groupId, existing.category_id || null, accountId, amount, date, description, now, now));
      if (accountId) {
        batch.push(c.env.DB.prepare(
          'UPDATE accounts SET saldo = saldo - ?, updated_at = ?, rev = rev + 1 WHERE id = ? AND void IS NULL'
        ).bind(amount, now, accountId));
      }
    }

    history = await recentServiceMatches(c.env.DB, scope, existing.keyword, vehicleId, HISTORY_LIMIT);
  } else {
    txnId = crypto.randomUUID();
    batch.push(c.env.DB.prepare(
      `INSERT INTO transactions (id, user_id, group_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'out', ?, ?, 1, ?, ?)`
    ).bind(txnId, userId, groupId, existing.category_id || null, accountId, amount, date, description, now, now));
    if (accountId) {
      batch.push(c.env.DB.prepare(
        'UPDATE accounts SET saldo = saldo - ?, updated_at = ?, rev = rev + 1 WHERE id = ? AND void IS NULL'
      ).bind(amount, now, accountId));
    }
    history = await recentMatches(c.env.DB, scope, existing.keyword, HISTORY_LIMIT);
  }

  const dates = [date, ...history.map((h) => h.date)].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const uniqueDates = dates.filter((d, i) => i === 0 || d !== dates[i - 1]).slice(0, HISTORY_LIMIT);
  const intervalDays = averageInterval(uniqueDates);
  const lastDate = uniqueDates[0] || date;
  const nextDue = intervalDays ? addDays(lastDate, intervalDays) : null;

  batch.push(c.env.DB.prepare(
    `UPDATE recurring_txns SET last_date = ?, interval_days = ?, next_due = ?, amount = ?, rev = rev + 1, updated_at = ? WHERE id = ?`
  ).bind(lastDate, intervalDays, nextDue, amount, now, id));

  await c.env.DB.batch(batch);

  const updated = await c.env.DB.prepare('SELECT * FROM recurring_txns WHERE id = ?').bind(id).first();
  return c.json({
    ok: true,
    data: { template: toRow(updated), transactionId: txnId, serviceHistoryId, intervalDays, lastDate, nextDue },
    error: null,
  });
});
