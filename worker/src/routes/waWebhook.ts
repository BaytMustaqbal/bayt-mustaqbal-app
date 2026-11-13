import { Hono } from 'hono';
import { Env } from '../types/env';
import { sendWA } from '../utils/fonnte';
import { findUserByPhone, menuText, parseIntent, formatSummary, formatSaldo, formatAgenda } from '../utils/waBot';

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

waWebhookRoutes.post('/', async (c) => {
  const env = c.env;

  // ---- 1. Verifikasi token ----
  const expected = env.FONNTE_WEBHOOK_TOKEN;
  if (!expected || expected.startsWith('dev-')) {
    return c.json({ ok: false, error: 'WEBHOOK_NOT_CONFIGURED' }, 503);
  }
  const got = c.req.query('token') || c.req.header('x-fonnte-token') || '';
  if (got !== expected) {
    return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  }

  // ---- 2. Baca payload ----
  const payload = (await c.req.json().catch(() => ({}))) as FonnteWebhookPayload;
  const sender = payload.sender || payload.member || '';
  const text = payload.message || payload.text || '';
  const inboxId = payload.inboxid;

  if (!sender || !text) {
    return c.json({ ok: true }); // abaikan pesan kosong/non-teks
  }

  // ---- 3. Cocokkan nomor → user keluarga ----
  const user = await findUserByPhone(env, sender);
  if (!user) {
    // Bukan nomor terdaftar: balas singkat.
    await sendWA(env, 'Maaf, nomor WhatsApp ini belum terdaftar di Bayt Mustaqbal.', sender, inboxId);
    return c.json({ ok: true });
  }

  // ---- 4. Router intent ----
  const intent = parseIntent(text);

  if (intent === null) {
    await sendWA(env, menuText(), sender, inboxId);
    return c.json({ ok: true });
  }

  if (intent === 'menu') {
    await sendWA(env, menuText(), sender, inboxId);
    return c.json({ ok: true });
  }

  const groupId = user.group_id;

  if (intent === '1') {
    // Rangkuman pengeluaran bulan ini.
    if (!groupId) {
      await sendWA(env, 'Akun belum tergabung ke grup keluarga.', sender, inboxId);
      return c.json({ ok: true });
    }
    const { month } = wibNow();
    const rows = await env.DB.prepare(
      `SELECT COALESCE(c.name, 'lainnya') AS label, SUM(t.amount) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.group_id = ? AND t.type = 'out' AND t.void IS NULL
         AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id
       ORDER BY total DESC
       LIMIT 10`
    ).bind(groupId, month + '-01', month + '-31').all();
    await sendWA(
      env,
      formatSummary((rows.results || []).map((r: any) => ({ label: r.label, total: Number(r.total) || 0 }))),
      sender,
      inboxId
    );
    return c.json({ ok: true });
  }

  if (intent === '2') {
    // Saldo bulan ini.
    if (!groupId) {
      await sendWA(env, 'Akun belum tergabung ke grup keluarga.', sender, inboxId);
      return c.json({ ok: true });
    }
    const { month } = wibNow();
    const row = await env.DB.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE 0 END), 0) AS inMonth,
         COALESCE(SUM(CASE WHEN type='out' THEN amount ELSE 0 END), 0) AS outMonth
       FROM transactions
       WHERE group_id = ? AND void IS NULL AND date >= ? AND date <= ?`
    ).bind(groupId, month + '-01', month + '-31').first() as { inMonth: number; outMonth: number };
    await sendWA(env, formatSaldo(Number(row.inMonth) || 0, Number(row.outMonth) || 0), sender, inboxId);
    return c.json({ ok: true });
  }

  // intent === '3' — Agenda hari ini.
  if (!groupId) {
    await sendWA(env, 'Akun belum tergabung ke grup keluarga.', sender, inboxId);
    return c.json({ ok: true });
  }
  const { today } = wibNow();
  const events = await env.DB.prepare(
    `SELECT title, time FROM calendar_events
     WHERE group_id = ? AND void IS NULL AND date = ?
     ORDER BY time ASC LIMIT 15`
  ).bind(groupId, today).all();
  const todayLabel = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  await sendWA(
    env,
    formatAgenda((events.results || []).map((e: any) => ({ time: e.time, title: e.title })), todayLabel),
    sender,
    inboxId
  );
  return c.json({ ok: true });
});
