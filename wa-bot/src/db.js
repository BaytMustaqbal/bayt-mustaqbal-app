import { samePhone } from './phone.js';

export function wibNow() {
  const shifted = new Date(Date.now() + 7 * 3600 * 1000);
  const iso = shifted.toISOString();
  return { today: iso.slice(0, 10), month: iso.slice(0, 7) };
}

export function reminderIso(spec) {
  const shifted = new Date(Date.now() + 7 * 3600 * 1000);
  shifted.setUTCDate(shifted.getUTCDate() + (spec.dayOffset || 0));
  shifted.setUTCHours(spec.hour ?? 9, spec.minute ?? 0, 0, 0);
  return shifted.toISOString();
}

export function formatRemindAtLabel(spec) {
  const day = (spec.dayOffset || 0) === 1 ? 'besok' : 'hari ini';
  const hh = String(spec.hour ?? 9).padStart(2, '0');
  const mm = String(spec.minute ?? 0).padStart(2, '0');
  return `${day} jam ${hh}:${mm} WIB`;
}

/** Cari user app dari nomor WA (cocok setelah normalisasi). */
export async function findUserByPhone(env, senderPhone) {
  if (!env.APP_DB) return null;
  const rows = await env.APP_DB.prepare(
    `SELECT id, nama, nickname, group_id, group_role, phone FROM users WHERE void IS NULL AND phone IS NOT NULL AND phone != ''`
  ).all();
  const list = rows.results || [];
  return list.find((r) => samePhone(r.phone, senderPhone)) || null;
}

export async function insertExpense(env, { userId, groupId, amount, note }) {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);
  const id = crypto.randomUUID();
  await env.APP_DB.prepare(
    `INSERT INTO transactions (id, user_id, group_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at, void)
     VALUES (?, ?, ?, NULL, NULL, ?, 'out', ?, ?, 1, ?, ?, NULL)`
  ).bind(id, userId, groupId || null, amount, today, note || null, nowIso, nowIso).run();
  return { id, today };
}

export async function monthExpenseTotal(env, { userId, groupId, ym }) {
  let stmt;
  if (groupId) {
    stmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE void IS NULL AND type = 'out' AND group_id = ? AND date LIKE ?`
    ).bind(groupId, `${ym}-%`);
  } else {
    stmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE void IS NULL AND type = 'out' AND user_id = ? AND date LIKE ?`
    ).bind(userId, `${ym}-%`);
  }
  const row = await stmt.first();
  return Number(row?.total || 0);
}

/** Dompet milik user (untuk catat pemasukan ke akun). */
export async function listOwnedAccounts(env, userId) {
  if (!env.APP_DB || !userId) return [];
  const rows = await env.APP_DB.prepare(
    `SELECT id, nama, saldo FROM accounts WHERE user_id = ? AND void IS NULL ORDER BY created_at ASC`
  ).bind(userId).all();
  return (rows.results || []).map((r) => ({ id: r.id, nama: r.nama, saldo: Number(r.saldo) || 0 }));
}

/** Simpan pemasukan (type in). Opsional ke dompet milik sendiri (update saldo atomik). */
export async function insertIncome(env, { userId, groupId, amount, note, accountId }) {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);
  const id = crypto.randomUUID();
  const amt = Math.abs(Number(amount) || 0);
  if (accountId) {
    const acct = await env.APP_DB.prepare(
      `SELECT id, nama FROM accounts WHERE id = ? AND user_id = ? AND void IS NULL`
    ).bind(accountId, userId).first();
    if (!acct) throw new Error('ACCOUNT_NOT_OWNED');
    await env.APP_DB.batch([
      env.APP_DB.prepare(
        `INSERT INTO transactions (id, user_id, group_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at, void)
         VALUES (?, ?, ?, NULL, ?, ?, 'in', ?, ?, 1, ?, ?, NULL)`
      ).bind(id, userId, groupId || null, accountId, amt, today, note || null, nowIso, nowIso),
      env.APP_DB.prepare(
        `UPDATE accounts SET saldo = saldo + ?, updated_at = ?, rev = rev + 1 WHERE id = ? AND void IS NULL`
      ).bind(amt, nowIso, accountId),
    ]);
    return { id, today, accountName: acct.nama };
  }
  await env.APP_DB.prepare(
    `INSERT INTO transactions (id, user_id, group_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at, void)
     VALUES (?, ?, ?, NULL, NULL, ?, 'in', ?, ?, 1, ?, ?, NULL)`
  ).bind(id, userId, groupId || null, amt, today, note || null, nowIso, nowIso).run();
  return { id, today, accountName: null };
}

export async function monthIncomeTotal(env, { userId, groupId, ym }) {
  let stmt;
  if (groupId) {
    stmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE void IS NULL AND type = 'in' AND group_id = ? AND date LIKE ?`
    ).bind(groupId, `${ym}-%`);
  } else {
    stmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE void IS NULL AND type = 'in' AND user_id = ? AND date LIKE ?`
    ).bind(userId, `${ym}-%`);
  }
  const row = await stmt.first();
  return Number(row?.total || 0);
}

export async function querySummary(env, groupId, from, to, title) {
  const rows = await env.APP_DB.prepare(
    `SELECT COALESCE(c.name, 'lainnya') AS label, SUM(t.amount) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.group_id = ? AND t.type = 'out' AND t.void IS NULL
       AND t.date >= ? AND t.date <= ?
     GROUP BY t.category_id
     ORDER BY total DESC
     LIMIT 10`
  ).bind(groupId, from, to).all();
  return { rows: (rows.results || []).map((r) => ({ label: r.label, total: Number(r.total) || 0 })), title };
}

export async function querySaldo(env, groupId, month) {
  const row = await env.APP_DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE 0 END), 0) AS inMonth,
       COALESCE(SUM(CASE WHEN type='out' THEN amount ELSE 0 END), 0) AS outMonth
     FROM transactions
     WHERE group_id = ? AND void IS NULL AND date >= ? AND date <= ?`
  ).bind(groupId, month + '-01', month + '-31').first();
  return { inMonth: Number(row?.inMonth || 0), outMonth: Number(row?.outMonth || 0) };
}

export async function queryAgenda(env, groupId, today) {
  const rows = await env.APP_DB.prepare(
    `SELECT title, time FROM calendar_events
     WHERE group_id = ? AND void IS NULL AND date = ?
     ORDER BY time ASC LIMIT 15`
  ).bind(groupId, today).all();
  return (rows.results || []).map((e) => ({ time: e.time, title: e.title }));
}

export async function queryBills(env, groupId) {
  const rows = await env.APP_DB.prepare(
    `SELECT name, amount, due_date FROM bills
     WHERE status = 'unpaid' AND void IS NULL
       AND user_id IN (SELECT id FROM users WHERE group_id = ? AND void IS NULL)
     ORDER BY due_date ASC LIMIT 10`
  ).bind(groupId).all();
  return (rows.results || []).map((r) => ({ name: r.name, amount: Number(r.amount) || 0, due_date: r.due_date }));
}

/** Simpan tagihan baru (status unpaid). */
export async function insertBill(env, { userId, name, amount, dueDate, kategori }) {
  const nowIso = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.APP_DB.prepare(
    `INSERT INTO bills (id, user_id, name, amount, due_date, kategori, status, paid_at, paid_amount, last_notified, recurring_id, rev, created_at, updated_at, void)
     VALUES (?, ?, ?, ?, ?, ?, 'unpaid', NULL, 0, NULL, NULL, 1, ?, ?, NULL)`
  ).bind(id, userId, String(name).trim().slice(0, 120), Math.abs(Number(amount) || 0), dueDate, kategori || null, nowIso, nowIso).run();
  return { id, dueDate };
}

/** Template transaksi berulang aktif milik grup (untuk hint di chat). */
export async function listRecurringTemplates(env, groupId) {
  const rows = await env.APP_DB.prepare(
    `SELECT id, nama, keyword, amount, interval_days, next_due FROM recurring_txns
     WHERE group_id = ? AND active = 1 AND void IS NULL
     ORDER BY nama ASC`
  ).bind(groupId).all();
  return (rows.results || []).map((r) => ({
    id: r.id,
    nama: r.nama,
    keyword: String(r.keyword || '').toLowerCase(),
    amount: Number(r.amount) || 0,
    intervalDays: r.interval_days == null ? null : Number(r.interval_days),
    nextDue: r.next_due || '',
  }));
}

/** Cari template yang keyword-nya muncul di teks transaksi. */
export function matchRecurringTemplate(templates, text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  return templates.find((tpl) => tpl.keyword && t.includes(tpl.keyword)) || null;
}

/** Simpan agenda baru (calendar_events). */
export async function insertAgenda(env, { userId, groupId, title, date, time, category, description }) {
  const nowIso = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.APP_DB.prepare(
    `INSERT INTO calendar_events (id, user_id, group_id, title, date, time, category, member_id, description, rev, created_at, updated_at, void)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?, NULL)`
  ).bind(id, userId, groupId || null, String(title).trim().slice(0, 140), date, time || null, category || null, description || null, nowIso, nowIso).run();
  return { id, date, time: time || null };
}

export async function queryGoals(env, groupId) {
  const rows = await env.APP_DB.prepare(
    `SELECT nama, target_amount, current_amount, achieved FROM goals
     WHERE group_id = ? AND void IS NULL AND achieved = 0
     ORDER BY updated_at DESC LIMIT 10`
  ).bind(groupId).all();
  return (rows.results || []).map((r) => ({
    nama: r.nama, target: Number(r.target_amount) || 0, current: Number(r.current_amount) || 0, achieved: Number(r.achieved) || 0,
  }));
}

export async function queryCategoryDetail(env, groupId, month) {
  const rows = await env.APP_DB.prepare(
    `SELECT COALESCE(c.name, 'lainnya') AS label, SUM(t.amount) AS total, COUNT(*) AS cnt
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.group_id = ? AND t.type = 'out' AND t.void IS NULL
       AND t.date >= ? AND t.date <= ?
     GROUP BY t.category_id
     ORDER BY total DESC
     LIMIT 12`
  ).bind(groupId, month + '-01', month + '-31').all();
  return (rows.results || []).map((r) => ({ label: r.label, total: Number(r.total) || 0, count: Number(r.cnt) || 0 }));
}

export async function insertReminder(env, { userId, groupId, message, remindAt }) {
  const id = crypto.randomUUID();
  await env.APP_DB.prepare(
    `INSERT INTO wa_reminders (id, user_id, group_id, message, remind_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, userId, groupId || null, message, remindAt).run();
  return id;
}

export async function listReminders(env, userId) {
  const rows = await env.APP_DB.prepare(
    `SELECT message, remind_at FROM wa_reminders WHERE user_id = ? AND done = 0 ORDER BY remind_at ASC LIMIT 10`
  ).bind(userId).all();
  return (rows.results || []).map((r) => ({ message: r.message, remind_at: r.remind_at }));
}

/* ---------- Tanya data (baca) ---------- */

/** Rentang tanggal dari preset periode. */
export function periodRange(period, today) {
  const day = (iso) => new Date(`${iso}T00:00:00Z`);
  const iso = (d) => d.toISOString().slice(0, 10);
  const t = day(today);
  if (period === 'bulan_lalu') {
    const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0));
    return { from: iso(first), to: iso(last) };
  }
  if (period === '7_hari') {
    const from = new Date(t.getTime() - 6 * 86400000);
    return { from: iso(from), to: today };
  }
  if (period === '30_hari') {
    const from = new Date(t.getTime() - 29 * 86400000);
    return { from: iso(from), to: today };
  }
  if (period === 'tahun_ini') {
    return { from: `${t.getUTCFullYear()}-01-01`, to: today };
  }
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/** Total + jumlah transaksi dalam rentang, opsional filter kategori/dompet. */
export async function queryTxTotal(env, { groupId, type, from, to, category, wallet }) {
  const cond = ['t.group_id = ?', 't.void IS NULL', 't.type = ?', 't.date >= ?', 't.date <= ?'];
  const args = [groupId, type, from, to];
  if (category) {
    cond.push(`(lower(COALESCE(t.description, '')) LIKE ? OR t.category_id IN (SELECT id FROM categories WHERE lower(name) LIKE ?))`);
    args.push(`%${category.toLowerCase()}%`, `%${category.toLowerCase()}%`);
  }
  if (wallet) {
    cond.push(`t.account_id IN (SELECT id FROM accounts WHERE lower(nama) LIKE ?)`);
    args.push(`%${wallet.toLowerCase()}%`);
  }
  const row = await env.APP_DB.prepare(
    `SELECT COALESCE(SUM(t.amount), 0) AS total, COUNT(*) AS cnt FROM transactions t WHERE ${cond.join(' AND ')}`
  ).bind(...args).first();
  return { total: Number(row?.total || 0), count: Number(row?.cnt || 0) };
}

/** Saldo semua dompet keluarga. */
export async function queryWalletBalances(env, groupId) {
  const rows = await env.APP_DB.prepare(
    `SELECT a.nama, a.saldo, a.bank FROM accounts a
     WHERE a.void IS NULL
       AND (a.group_id = ? OR a.user_id IN (SELECT id FROM users WHERE group_id = ? AND void IS NULL))
     ORDER BY a.saldo DESC LIMIT 15`
  ).bind(groupId, groupId).all();
  return (rows.results || []).map((r) => ({
    nama: r.nama, saldo: Number(r.saldo) || 0, bank: r.bank || null,
  }));
}

/** Kategori pengeluaran terbesar dalam rentang. */
export async function queryTopCategories(env, groupId, from, to, limit = 5) {
  const rows = await env.APP_DB.prepare(
    `SELECT COALESCE(c.name, 'Tanpa kategori') AS label, SUM(t.amount) AS total, COUNT(*) AS cnt
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.group_id = ? AND t.type = 'out' AND t.void IS NULL
       AND t.date >= ? AND t.date <= ?
     GROUP BY t.category_id ORDER BY total DESC LIMIT ?`
  ).bind(groupId, from, to, limit).all();
  return (rows.results || []).map((r) => ({ label: r.label, total: Number(r.total) || 0, count: Number(r.cnt) || 0 }));
}

/** Transaksi terakhir keluarga. */
export async function queryLastTransactions(env, groupId, limit = 5) {
  const rows = await env.APP_DB.prepare(
    `SELECT t.date, t.description, t.amount, t.type, COALESCE(c.name, '') AS kategori
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.group_id = ? AND t.void IS NULL
     ORDER BY t.date DESC, t.created_at DESC LIMIT ?`
  ).bind(groupId, limit).all();
  return (rows.results || []).map((r) => ({
    date: r.date, description: r.description || '', amount: Number(r.amount) || 0,
    type: r.type, kategori: r.kategori || '',
  }));
}

/* ---------- Undo aksi tulis terakhir ---------- */

/** Batalkan aksi tulis terakhir (transaksi/tagihan/agenda/pengingat). */
export async function undoAction(env, undo, userId) {
  if (!undo || !undo.kind) return false;
  const nowIso = new Date().toISOString();
  if (undo.kind === 'transaction') {
    const stmt = env.APP_DB.prepare(
      'UPDATE transactions SET void = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
    ).bind(nowIso, nowIso, undo.id, userId);
    const res = await stmt.run();
    if (!res.meta?.changes) return false;
    if (undo.accountId && undo.amount) {
      const delta = undo.type === 'in' ? -Math.abs(Number(undo.amount)) : Math.abs(Number(undo.amount));
      await env.APP_DB.prepare(
        'UPDATE accounts SET saldo = saldo + ?, updated_at = ?, rev = rev + 1 WHERE id = ? AND void IS NULL'
      ).bind(delta, nowIso, undo.accountId).run();
    }
    return true;
  }
  if (undo.kind === 'bill') {
    const res = await env.APP_DB.prepare(
      'UPDATE bills SET void = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
    ).bind(nowIso, nowIso, undo.id, userId).run();
    return !!res.meta?.changes;
  }
  if (undo.kind === 'agenda') {
    const res = await env.APP_DB.prepare(
      'UPDATE calendar_events SET void = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND void IS NULL'
    ).bind(nowIso, nowIso, undo.id, userId).run();
    return !!res.meta?.changes;
  }
  if (undo.kind === 'reminder') {
    const res = await env.APP_DB.prepare(
      'UPDATE wa_reminders SET done = 1 WHERE id = ? AND user_id = ? AND done = 0'
    ).bind(undo.id, userId).run();
    return !!res.meta?.changes;
  }
  return false;
}
