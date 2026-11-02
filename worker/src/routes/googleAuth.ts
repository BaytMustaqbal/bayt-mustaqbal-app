import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { Env } from '../types/env';
import { signToken } from '../utils/auth';
import { APP_ORIGINS } from '../utils/gcal';

const GOOGLE_AUTH = 'https://oauth2.googleapis.com';
const API_ORIGIN = 'https://api.baytmustaqbal.my.id';
const DEFAULT_ORIGIN = 'https://app.baytmustaqbal.my.id';

type LoginState = { kind: 'login'; origin: string };

/** redirect_uri login: dev (origin lokal) vs produksi (domain API). */
function resolveLoginRedirectUri(origin: string): string {
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return `${isLocal ? origin : API_ORIGIN}/api/auth/google/callback`;
}

function signLoginState(secret: string, origin: string): string {
  return jwt.sign({ kind: 'login', origin } satisfies LoginState, secret, { expiresIn: '10m' });
}

function verifyLoginState(secret: string, state?: string | null): LoginState | null {
  if (!state || !secret) return null;
  try {
    const p = jwt.verify(state, secret) as Partial<LoginState>;
    if (p.kind !== 'login' || !p.origin) return null;
    if (!APP_ORIGINS.includes(p.origin)) return null;
    return { kind: 'login', origin: p.origin };
  } catch {
    return null;
  }
}

function buildLoginConsentUrl(env: Env, origin: string, state: string): string {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID belum di-set');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: resolveLoginRedirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export const googleAuthRoutes = new Hono<{ Bindings: Env }>();

// GET /api/auth/google/login?origin=… → redirect ke consent Google (login).
googleAuthRoutes.get('/login', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.json(
      {
        ok: false,
        data: null,
        error: { code: 'GCAL_NOT_CONFIGURED', message: 'Google OAuth belum di-set di Worker' },
      },
      503
    );
  }
  const rawOrigin = c.req.query('origin') || DEFAULT_ORIGIN;
  const origin = APP_ORIGINS.includes(rawOrigin) ? rawOrigin : DEFAULT_ORIGIN;
  const state = signLoginState(c.env.JWT_SECRET, origin);
  const url = buildLoginConsentUrl(c.env, origin, state);
  return c.redirect(url, 302);
});

// GET /api/auth/google/callback — tujuan balik Google (publik).
googleAuthRoutes.get('/callback', async (c) => {
  const state = verifyLoginState(c.env.JWT_SECRET, c.req.query('state'));
  const origin = state?.origin || DEFAULT_ORIGIN;
  const fail = (reason: string) =>
    c.redirect(`${origin}/?google=error&reason=${encodeURIComponent(reason)}`, 302);

  if (!state) return fail('state_invalid');
  if (c.req.query('error')) return fail(c.req.query('error') || 'access_denied');

  const code = c.req.query('code');
  if (!code) return fail('no_code');

  const res = await fetch(`${GOOGLE_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: c.env.GOOGLE_CLIENT_ID || '',
      client_secret: c.env.GOOGLE_CLIENT_SECRET || '',
      code,
      redirect_uri: resolveLoginRedirectUri(origin),
    }),
  });
  if (!res.ok) {
    console.error('Google login token exchange gagal:', res.status);
    return fail('token_exchange_failed');
  }
  const tokens = (await res.json()) as { id_token?: string; access_token?: string };
  const idToken = tokens.id_token || tokens.access_token;
  if (!idToken) return fail('no_id_token');

  // Verifikasi identitas via tokeninfo Google (HTTPS), ambil email + sub.
  const info = await fetch(`${GOOGLE_AUTH}/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!info.ok) return fail('tokeninfo_failed');
  const profile = (await info.json()) as { email?: string; sub?: string };
  const email = (profile.email || '').toLowerCase();
  const sub = profile.sub;
  if (!email || !sub) return fail('no_profile');

  // Hanya akun yang SUDAH terdaftar (username = email) yang boleh masuk.
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE username = ? AND void IS NULL'
  ).bind(email).first() as any;
  if (!user) return fail('akun_tidak_ditemukan');

  // Kalau google_sub sudah terikat, harus sama (cegah spoof email).
  if (user.google_sub && user.google_sub !== sub) return fail('akun_google_berbeda');
  if (!user.google_sub) {
    await c.env.DB.prepare('UPDATE users SET google_sub = ?, updated_at = ? WHERE id = ?')
      .bind(sub, new Date().toISOString(), user.id)
      .run();
  }

  const token = signToken({ userId: user.id, role: user.role }, c.env.JWT_SECRET);
  return c.redirect(`${origin}/?google=success&token=${encodeURIComponent(token)}`, 302);
});
