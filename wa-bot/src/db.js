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
    `SELECT id, nama, nickname, group_id, phone FROM users WHERE void IS NULL AND phone IS NOT NULL AND phone != ''`
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
     WHERE group_id = ? AND status = 'unpaid' AND void IS NULL
     ORDER BY due_date ASC LIMIT 10`
  ).bind(groupId).all();
  return (rows.results || []).map((r) => ({ name: r.name, amount: Number(r.amount) || 0, due_date: r.due_date }));
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
