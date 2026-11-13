import { Hono } from 'hono';
import { Env } from '../types/env';
import { sendWA } from '../utils/fonnte';
import {
  findUserByPhone,
  menuText,
  parseIntent,
  parseReminder,
  formatSummary,
  formatSaldo,
  formatAgenda,
  formatBills,
  formatGoals,
  formatCategoryDetail,
  formatReminders,
  formatReminderSaved,
  formatReminderHelp,
} from '../utils/waBot';

/**
 * Webhook WhatsApp (Fonnte) untuk WA bot menu bernomor.
 *
 * Alur:
 *   1. Fonnte mengirim POST ke URL ini (diset di dashboard Fonnte).
 *   2. Verifikasi token (via query ?token= atau header x-fonnte-token).
 *   3. Baca payload, cocokkan nomor pengirim ke user keluarga (kolom phone).
 *   4. Router intent → query D1 → balas via sendWA.
 */

type FonnteWebhookPayload = {
  sender?: string;
  message?: string;
  text?: string;
  inboxid?: string;
  member?: string;
  name?: string;
};

export const waWebhookRoutes = new Hono<{ Bindings: Env }>();

/** Tanggal & bulan ini dalam zona WIB (UTC+7). */
function wibNow() {
  const shifted = new Date(Date.now() + 7 * 3600 * 1000);
  const iso = shifted.toISOString();
  return { today: iso.slice(0, 10), month: iso.slice(0, 7) };
}

/** ISO untuk pengingat (digeser ke WIB). spec dari parseReminder. */
function reminderIso(spec: { dayOffset: number; hour: number; minute: number }): string {
  const shifted = new Date(Date.now() + 7 * 3600 * 1000);
  shifted.setUTCDate(shifted.getUTCDate() + spec.dayOffset);
  shifted.setUTCHours(spec.hour, spec.minute, 0, 0);
  return shifted.toISOString();
}

waWebhookRoutes.post('/', async (c) => {
  const env = c.env;

  const expected = env.FONNTE_WEBHOOK_TOKEN;
  if (!expected || expected.startsWith('dev-')) {
    return c.json({ ok: false, error: 'WEBHOOK_NOT_CONFIGURED' }, 503);
  }
  const got = c.req.query('token') || c.req.header('x-fonnte-token') || '';
  if (got !== expected) {
    return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  }

  const payload = (await c.req.json().catch(() => ({}))) as FonnteWebhookPayload;
  const sender = payload.sender || payload.member || '';
  const text = payload.message || payload.text || '';
  const inboxId = payload.inboxid;

  if (!sender || !text) {
    return c.json({ ok: true });
  }

  const user = await findUserByPhone(env, sender);
  if (!user) {
    await sendWA(env, 'Maaf, nomor WhatsApp ini belum terdaftar di Bayt Mustaqbal.', sender, inboxId);
    return c.json({ ok: true });
  }

  const intent = parseIntent(text);

  const reply = async (msg: string) => {
    await sendWA(env, msg, sender, inboxId);
  };

  if (intent === null || intent === 'menu') {
    await reply(menuText());
    return c.json({ ok: true });
  }

  const groupId = user.group_id;
  if (!groupId) {
    await reply('Akun belum tergabung ke grup keluarga.');
    return c.json({ ok: true });
  }

  if (intent === '1' || intent === '6') {
    // Rangkuman. '1' = bulan ini, '6' = 7 hari terakhir.
    const now = wibNow();
    let from: string;
    let title: string;
    if (intent === '1') {
      from = now.month + '-01';
      title = '*Rangkuman Pengeluaran Bulan Ini*';
    } else {
      const d = new Date(Date.now() + 7 * 3600 * 1000 - 6 * 86400 * 1000);
      from = d.toISOString().slice(0, 10);
      title = '*Rangkuman Pengeluaran 7 Hari Terakhir*';
    }
    const rows = await env.DB.prepare(
      `SELECT COALESCE(c.name, 'lainnya') AS label, SUM(t.amount) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.group_id = ? AND t.type = 'out' AND t.void IS NULL
         AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id
       ORDER BY total DESC
       LIMIT 10`
    ).bind(groupId, from, now.today).all();
    await reply(formatSummary((rows.results || []).map((r: any) => ({ label: r.label, total: Number(r.total) || 0 })), title));
    return c.json({ ok: true });
  }

  if (intent === '2') {
    const { month } = wibNow();
    const row = await env.DB.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE 0 END), 0) AS inMonth,
         COALESCE(SUM(CASE WHEN type='out' THEN amount ELSE 0 END), 0) AS outMonth
       FROM transactions
       WHERE group_id = ? AND void IS NULL AND date >= ? AND date <= ?`
    ).bind(groupId, month + '-01', month + '-31').first() as { inMonth: number; outMonth: number };
    await reply(formatSaldo(Number(row.inMonth) || 0, Number(row.outMonth) || 0));
    return c.json({ ok: true });
  }

  if (intent === '3') {
    const { today } = wibNow();
    const events = await env.DB.prepare(
      `SELECT title, time FROM calendar_events
       WHERE group_id = ? AND void IS NULL AND date = ?
       ORDER BY time ASC LIMIT 15`
    ).bind(groupId, today).all();
    await reply(formatAgenda((events.results || []).map((e: any) => ({ time: e.time, title: e.title })), today));
    return c.json({ ok: true });
  }

  if (intent === '4') {
    const rows = await env.DB.prepare(
      `SELECT name, amount, due_date FROM bills
       WHERE group_id = ? AND status = 'unpaid' AND void IS NULL
       ORDER BY due_date ASC LIMIT 10`
    ).bind(groupId).all();
    await reply(formatBills((rows.results || []).map((r: any) => ({ name: r.name, amount: Number(r.amount) || 0, due_date: r.due_date }))));
    return c.json({ ok: true });
  }

  if (intent === '5') {
    const rows = await env.DB.prepare(
      `SELECT nama, target_amount, current_amount, achieved FROM goals
       WHERE group_id = ? AND void IS NULL AND achieved = 0
       ORDER BY updated_at DESC LIMIT 10`
    ).bind(groupId).all();
    await reply(formatGoals((rows.results || []).map((r: any) => ({
      nama: r.nama, target: Number(r.target_amount) || 0, current: Number(r.current_amount) || 0, achieved: Number(r.achieved) || 0,
    }))));
    return c.json({ ok: true });
  }

  if (intent === '7') {
    const { month } = wibNow();
    const rows = await env.DB.prepare(
      `SELECT COALESCE(c.name, 'lainnya') AS label, SUM(t.amount) AS total, COUNT(*) AS cnt
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.group_id = ? AND t.type = 'out' AND t.void IS NULL
         AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id
       ORDER BY total DESC
       LIMIT 12`
    ).bind(groupId, month + '-01', month + '-31').all();
    await reply(formatCategoryDetail((rows.results || []).map((r: any) => ({
      label: r.label, total: Number(r.total) || 0, count: Number(r.cnt) || 0,
    }))));
    return c.json({ ok: true });
  }

  // intent === '8' — Pengingat.
  if (/cek|daftar|list/.test(text)) {
    const rows = await env.DB.prepare(
      `SELECT message, remind_at FROM wa_reminders
       WHERE user_id = ? AND done = 0
       ORDER BY remind_at ASC LIMIT 10`
    ).bind(user.id).all();
    await reply(formatReminders((rows.results || []).map((r: any) => ({ message: r.message, remind_at: r.remind_at }))));
    return c.json({ ok: true });
  }

  const spec = parseReminder(text);
  if (!spec) {
    await reply(formatReminderHelp());
    return c.json({ ok: true });
  }
  await env.DB.prepare(
    `INSERT INTO wa_reminders (id, user_id, group_id, message, remind_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), user.id, groupId, spec.message, reminderIso(spec)).run();
  await reply(formatReminderSaved(`"${spec.message}"`));
  return c.json({ ok: true });
});
