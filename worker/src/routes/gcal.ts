import { Hono } from 'hono';
import { Env } from '../types/env';
import {
  APP_ORIGINS,
  buildConsentUrl,
  resolveRedirectUri,
  signGcalState,
  verifyGcalState,
  getConnection,
} from '../utils/gcal';

const GOOGLE_AUTH = 'https://oauth2.googleapis.com';
const DEFAULT_ORIGIN = 'https://app.baytmustaqbal.my.id';

export const gcalRoutes = new Hono<{ Bindings: Env }>();

// Catatan: auth global /api/* sudah menutupi semua path di sini kecuali
// /api/gcal/callback (di-skip di middleware/auth.ts).

// GET /api/gcal/status — status koneksi Google Calendar milik user ini
gcalRoutes.get('/status', async (c) => {
  const conn = await getConnection(c.env, c.get('userId'));
  return c.json({
    ok: true,
    data: {
      connected: !!conn,
      email: conn?.google_email ?? null,
      calendar_id: conn?.calendar_id ?? null,
      expires_at: conn?.token_expires_at ?? null,
    },
    error: null,
  });
});

// GET /api/gcal/login?origin=… — ambil URL consent Google (dipanggil fetch dari frontend)
gcalRoutes.get('/login', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.json(
      {
        ok: false,
        data: null,
        error: {
          code: 'GCAL_NOT_CONFIGURED',
          message: 'Google OAuth belum di-set di Worker (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
        },
      },
      503
    );
  }

  const rawOrigin = c.req.query('origin') || DEFAULT_ORIGIN;
  // Origin harus dari allowlist — state yang ditandatangani tidak boleh
  // membawa tujuan balik sembarangan.
  const origin = APP_ORIGINS.includes(rawOrigin) ? rawOrigin : DEFAULT_ORIGIN;

  const state = signGcalState(c.env.JWT_SECRET, { userId: c.get('userId'), origin });
  const url = buildConsentUrl(c.env, origin, state);
  return c.json({ ok: true, data: { url }, error: null });
});

// GET /api/gcal/callback — tujuan balik Google (TANPA auth: Google tidak bawa token).
// Identitas user diambil dari `state` yang sudah kita tandatangani sendiri.
gcalRoutes.get('/callback', async (c) => {
  const state = verifyGcalState(c.env.JWT_SECRET, c.req.query('state'));
  const origin = state?.origin || DEFAULT_ORIGIN;
  const fail = (reason: string) => c.redirect(`${origin}/?gcal=error&reason=${encodeURIComponent(reason)}`, 302);

  if (!state) return fail('state_invalid');

  const googleError = c.req.query('error');
  if (googleError) return fail(googleError);

  const code = c.req.query('code');
  if (!code) return fail('no_code');

  // Tukar code → token. redirect_uri WAJIB sama dengan yang dipakai di /login.
  const res = await fetch(`${GOOGLE_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: c.env.GOOGLE_CLIENT_ID || '',
      client_secret: c.env.GOOGLE_CLIENT_SECRET || '',
      code,
      redirect_uri: resolveRedirectUri(state.origin),
    }),
  });
  if (!res.ok) {
    console.error('GCal token exchange gagal:', res.status, await res.text());
    return fail('token_exchange_failed');
  }
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
  };

  // refresh_token tidak selalu dikirim ulang; tanpa itu sinkron mati setelah
  // 1 jam, jadi gagal di sini lebih baik daripada tersambung tapi tidak jalan.
  if (!tokens.refresh_token) {
    console.error('GCal: Google tidak memberi refresh_token (prompt=consent seharusnya memaksa)');
    return fail('no_refresh_token');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + (tokens.expires_in || 3600) * 1000).toISOString();

  // Email/sub dari id_token. Catatan: payload id_token dibaca tanpa verifikasi
  // signature (cukup untuk tampilan; token simpanan tetap berasal dari code
  // yang Google berikan). Kalau gagal, koneksi tetap sah tanpa email.
  let sub: string | null = null;
  let email: string | null = null;
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(atob(tokens.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      sub = payload.sub ?? null;
      email = payload.email ?? null;
    } catch {
      /* tampilan email saja, bukan keputusan akses */
    }
  }

  const existing = await getConnection(c.env, state.userId);
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE gcal_connections
         SET google_sub = ?, google_email = COALESCE(?, google_email), access_token = ?,
             refresh_token = ?, token_expires_at = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(sub, email, tokens.access_token, tokens.refresh_token, expiresAt, now.toISOString(), existing.id)
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO gcal_connections
         (id, user_id, google_sub, google_email, calendar_id, access_token, refresh_token, token_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'primary', ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        state.userId,
        sub,
        email,
        tokens.access_token,
        tokens.refresh_token,
        expiresAt,
        now.toISOString(),
        now.toISOString()
      )
      .run();
  }

  return c.redirect(`${origin}/?gcal=connected`, 302);
});

// POST /api/gcal/disconnect — cabut koneksi. gcal_links DIPERTAHANKAN supaya
// kalau connect lagi, event Google yang lama di-update (bukan duplikat baru).
gcalRoutes.post('/disconnect', async (c) => {
  const userId = c.get('userId');
  await c.env.DB.prepare('DELETE FROM gcal_connections WHERE user_id = ?').bind(userId).run();
  return c.json({ ok: true, data: { connected: false }, error: null });
});
