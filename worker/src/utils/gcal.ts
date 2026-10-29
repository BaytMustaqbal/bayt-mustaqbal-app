import jwt from 'jsonwebtoken';
import { Env } from '../types/env';

/**
 * Util integrasi Google Calendar (satu arah: app → Google).
 *
 * Alur:
 *  1. User klik "Hubungkan" → GET /api/gcal/login → redirect ke consent Google.
 *  2. Google balik ke GET /api/gcal/callback → tukar code → simpan token di
 *     gcal_connections (satu baris per user; skema mendukung banyak user).
 *  3. Setiap create/update/void agenda (cal) atau tagihan (bill) menulis baris
 *     ke gcal_outbox, lalu dicoba sekali inline. Gagal → diproses ulang cron.
 *  4. gcal_links menyimpan mapping entity ↔ google_event_id supaya update/delete
 *     mengenai event Google yang sama (bukan membuat duplikat).
 */

const GOOGLE_AUTH = 'https://oauth2.googleapis.com';
const GOOGLE_API = 'https://www.googleapis.com/calendar/v3';
const API_ORIGIN = 'https://api.baytmustaqbal.my.id';
const TIMEZONE = 'Asia/Jakarta';

/** Origin frontend yang boleh dipakai sebagai tujuan balik setelah OAuth. */
export const APP_ORIGINS = [
  'https://app.baytmustaqbal.my.id',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const MAX_ATTEMPTS = 8;

export type GcalEntityType = 'cal' | 'bill';
export type GcalAction = 'upsert' | 'delete';

export interface GcalConnection {
  id: string;
  user_id: string;
  google_sub: string | null;
  google_email: string | null;
  calendar_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

export interface GcalEventInput {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
}

/* ---- Logika murni (diuji unit test) ---- */

/** '2026-10-31' → '2026-11-01' (untuk all-day end yang exclusive). */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Jam + 1 jam, menyeleweng ke hari berikutnya kalau perlu. '19:30' → '20:30'. */
function plusOneHour(time: string): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const total = (h || 0) * 60 + (m || 0) + 60;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatRupiah(amount: unknown): string {
  const n = Number(amount);
  return `Rp ${Number.isFinite(n) ? n.toLocaleString('id-ID') : String(amount)}`;
}

/**
 * Konversi row D1 (calendar_events / bills) → payload Events milik Google.
 * Agenda dengan jam jadi event bertanggal (zona Asia/Jakarta); tanpa jam & tagihan
 * jadi all-day.
 */
export function buildEventPayload(type: GcalEntityType, row: any): GcalEventInput {
  if (type === 'bill') {
    const paid = row.status === 'paid';
    const lines = [
      row.kategori ? `Kategori: ${row.kategori}` : null,
      `Nominal: ${formatRupiah(row.amount)}`,
      Number(row.paid_amount) > 0 ? `Terbayar: ${formatRupiah(row.paid_amount)}` : null,
      `Status: ${paid ? 'lunas' : 'belum lunas'}`,
      `Jatuh tempo: ${row.due_date}`,
      'Sumber: Bayt Mustaqbal',
    ].filter(Boolean);
    return {
      summary: paid ? `${row.name} (LUNAS)` : row.name,
      description: lines.join('\n'),
      start: { date: row.due_date },
      end: { date: nextDay(row.due_date) },
    };
  }

  // Agenda (calendar_events)
  const parts: string[] = [];
  if (row.description) parts.push(row.description);
  if (row.category) parts.push(`Kategori: ${row.category}`);
  parts.push('Sumber: Bayt Mustaqbal');

  if (row.time) {
    return {
      summary: row.title || 'Agenda',
      description: parts.join('\n'),
      start: { dateTime: `${row.date}T${row.time}:00`, timeZone: TIMEZONE },
      end: { dateTime: `${row.date}T${plusOneHour(row.time)}:00`, timeZone: TIMEZONE },
    };
  }
  return {
    summary: row.title || 'Agenda',
    description: parts.join('\n'),
    start: { date: row.date },
    end: { date: nextDay(row.date) },
  };
}

/** redirect_uri Google: dev (origin lokal, lewat proxy Vite) vs produksi. */
export function resolveRedirectUri(origin: string): string {
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return `${isLocal ? origin : API_ORIGIN}/api/gcal/callback`;
}

export function buildConsentUrl(env: Env, origin: string, state: string): string {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID belum di-set');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: resolveRedirectUri(origin),
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events openid email',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** State OAuth: JWT berisi userId + origin tujuan balik (berlaku 10 menit). */
export function signGcalState(
  secret: string,
  payload: { userId: string; origin: string }
): string {
  return jwt.sign({ kind: 'gcal', userId: payload.userId, origin: payload.origin }, secret, {
    expiresIn: '10m',
  });
}

export function verifyGcalState(
  secret: string,
  state: string | undefined | null
): { kind: 'gcal'; userId: string; origin: string } | null {
  if (!state || !secret) return null;
  try {
    const p = jwt.verify(state, secret) as { kind?: string; userId?: string; origin?: string };
    if (p.kind !== 'gcal' || !p.userId || !p.origin) return null;
    // Origin tujuan wajib dari allowlist — cegah open redirect.
    if (!APP_ORIGINS.includes(p.origin)) return null;
    return { kind: 'gcal', userId: p.userId, origin: p.origin };
  } catch {
    return null;
  }
}

/* ---- Akses token ---- */

export async function getConnection(env: Env, userId: string): Promise<GcalConnection | null> {
  const row = await env.DB.prepare('SELECT * FROM gcal_connections WHERE user_id = ?')
    .bind(userId)
    .first();
  return (row as GcalConnection | null) ?? null;
}

/**
 * Cari pemilik koneksi untuk push: penulis dulu, kalau dia belum connect,
 * pakai anggota grup mana pun yang sudah connect (fase ini 1 akun keluarga).
 */
export async function resolveConnectionUserId(
  env: Env,
  writerUserId: string,
  groupId: string | null
): Promise<string | null> {
  const own = await env.DB.prepare('SELECT user_id FROM gcal_connections WHERE user_id = ?')
    .bind(writerUserId)
    .first();
  if (own) return writerUserId;

  if (groupId) {
    const group = await env.DB.prepare(
      'SELECT c.user_id AS user_id FROM gcal_connections c JOIN users u ON u.id = c.user_id WHERE u.group_id = ? AND u.void IS NULL LIMIT 1'
    )
      .bind(groupId)
      .first();
    if (group) return (group as { user_id: string }).user_id;
  }
  return null;
}

/** Ambil access token yang masih berlaku; refresh otomatis kalau mau habis. */
export async function ensureAccessToken(env: Env, conn: GcalConnection): Promise<string> {
  const expiresAt = Date.parse(conn.token_expires_at);
  if (Number.isFinite(expiresAt) && Date.now() + 60_000 < expiresAt) {
    return conn.access_token;
  }

  const res = await fetch(`${GOOGLE_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.GOOGLE_CLIENT_ID || '',
      client_secret: env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google refresh token gagal (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  const now = new Date();
  const expiresAtNew = new Date(now.getTime() + (data.expires_in || 3600) * 1000).toISOString();

  await env.DB.prepare(
    'UPDATE gcal_connections SET access_token = ?, token_expires_at = ?, updated_at = ? WHERE id = ?'
  )
    .bind(data.access_token, expiresAtNew, now.toISOString(), conn.id)
    .run();

  conn.access_token = data.access_token;
  conn.token_expires_at = expiresAtNew;
  return data.access_token;
}

/* ---- Outbox ---- */

/**
 * Tulis pekerjaan sinkron ke outbox. Tidak ada koneksi Google → tidak ada
 * baris (push dilewati senyap). Return id baris, atau null kalau dilewati.
 */
export async function enqueueGcal(
  env: Env,
  opts: { writerUserId: string; groupId: string | null; entityType: GcalEntityType; entityId: string; action: GcalAction }
): Promise<string | null> {
  const owner = await resolveConnectionUserId(env, opts.writerUserId, opts.groupId);
  if (!owner) return null;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO gcal_outbox (id, user_id, entity_type, entity_id, action, attempts, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       action = excluded.action, attempts = 0, last_error = NULL, updated_at = excluded.updated_at`
  )
    .bind(id, owner, opts.entityType, opts.entityId, opts.action, now, now)
    .run();
  return id;
}

async function googleCall(
  env: Env,
  conn: GcalConnection,
  path: string,
  init: RequestInit
): Promise<Response> {
  const token = await ensureAccessToken(env, conn);
  return fetch(`${GOOGLE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

/**
 * Proses satu baris outbox: create/update/void entity ke Google Calendar.
 * Sukses → baris outbox dihapus. Gagal → lempar (pemanggil menaikkan attempts).
 */
export async function processOutboxItem(env: Env, item: any): Promise<void> {
  const conn = await getConnection(env, item.user_id);
  if (!conn) {
    // Koneksi dicabut sebelum antrian sempat diproses.
    await env.DB.prepare('DELETE FROM gcal_outbox WHERE id = ?').bind(item.id).run();
    return;
  }

  const link = (await env.DB.prepare(
    'SELECT * FROM gcal_links WHERE entity_type = ? AND entity_id = ?'
  )
    .bind(item.entity_type, item.entity_id)
    .first()) as { id: string; google_event_id: string } | null;

  const row =
    item.entity_type === 'cal'
      ? await env.DB.prepare('SELECT * FROM calendar_events WHERE id = ?').bind(item.entity_id).first()
      : await env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(item.entity_id).first();

  // Row hilang / soft-deleted → samakan dengan Google (hapus event-nya).
  const action: GcalAction = !row || (row as any).void ? 'delete' : item.action;

  if (action === 'delete') {
    if (link) {
      const res = await googleCall(env, conn, `/calendars/${encodeURIComponent(conn.calendar_id)}/events/${link.google_event_id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        throw new Error(`Google delete gagal (${res.status}): ${await res.text()}`);
      }
      await env.DB.prepare('DELETE FROM gcal_links WHERE id = ?').bind(link.id).run();
    }
    await env.DB.prepare('DELETE FROM gcal_outbox WHERE id = ?').bind(item.id).run();
    return;
  }

  const payload = buildEventPayload(item.entity_type, row);
  const base = `/calendars/${encodeURIComponent(conn.calendar_id)}/events`;

  if (link) {
    const res = await googleCall(env, conn, `${base}/${link.google_event_id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await env.DB.prepare('DELETE FROM gcal_outbox WHERE id = ?').bind(item.id).run();
      return;
    }
    if (res.status === 404) {
      // Event hilang di Google → buat baru pakai link lama.
      await env.DB.prepare('DELETE FROM gcal_links WHERE id = ?').bind(link.id).run();
    } else {
      throw new Error(`Google patch gagal (${res.status}): ${await res.text()}`);
    }
  }

  const created = await googleCall(env, conn, base, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!created.ok) {
    throw new Error(`Google insert gagal (${created.status}): ${await created.text()}`);
  }
  const eventData = (await created.json()) as { id: string };
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO gcal_links (id, user_id, entity_type, entity_id, google_event_id, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       google_event_id = excluded.google_event_id, last_synced_at = excluded.last_synced_at`
  )
    .bind(crypto.randomUUID(), item.user_id, item.entity_type, item.entity_id, eventData.id, now)
    .run();
  await env.DB.prepare('DELETE FROM gcal_outbox WHERE id = ?').bind(item.id).run();
}

/**
 * Hook untuk routes/cal.ts & routes/bill.ts: enqueue lalu coba sekali inline.
 * Gagal? Biarkan, cron hourly yang retry. Tidak pernah melempar ke pemanggil
 * supaya operasi CRUD utama tetap sukses walau Google lagi down.
 */
export async function syncToGcal(
  env: Env,
  opts: { writerUserId: string; groupId: string | null; entityType: GcalEntityType; entityId: string; action: GcalAction }
): Promise<void> {
  try {
    const id = await enqueueGcal(env, opts);
    if (!id) return;
    const item = await env.DB.prepare('SELECT * FROM gcal_outbox WHERE id = ?').bind(id).first();
    if (item) await processOutboxItem(env, item);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await env.DB.prepare(
        'UPDATE gcal_outbox SET attempts = attempts + 1, last_error = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ?'
      ).bind(msg, new Date().toISOString(), opts.entityType, opts.entityId).run();
    } catch {
      // dicatat oleh cron berikutnya
    }
  }
}

/** Dipanggil cron tiap jam: proses sisa antrian yang belum menyerah. */
export async function processOutbox(env: Env, limit = 10): Promise<void> {
  const rows = await env.DB.prepare(
    `SELECT * FROM gcal_outbox WHERE attempts < ${MAX_ATTEMPTS} ORDER BY created_at ASC LIMIT ?`
  )
    .bind(limit)
    .all();

  const items = rows.results || [];
  let done = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await processOutboxItem(env, item);
      done++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      await env.DB.prepare(
        'UPDATE gcal_outbox SET attempts = attempts + 1, last_error = ?, updated_at = ? WHERE id = ?'
      ).bind(msg, new Date().toISOString(), item.id).run();
    }
  }

  if (items.length > 0) {
    console.log(`GCal outbox: ${done} tersinkron, ${failed} gagal`);
  }
}
