import { Context, Next } from 'hono';
import { verifyToken, verifySessionActive } from '../utils/auth';
import { Env } from '../types/env';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const path = c.req.path;
  // Bot WA memakai token bersama (bukan JWT) untuk baca foto struk.
  // Scan tidak menulis data dan tidak butuh userId.
  if (path === '/api/receipt/scan' && c.env.RECEIPT_TOKEN) {
    const shared = c.req.header('X-Receipt-Token') || '';
    if (safeEqual(shared, c.env.RECEIPT_TOKEN)) {
      c.set('role', 'bot');
      c.set('userId', '');
      c.set('groupId', null);
      c.set('groupRole', 'anak');
      return next();
    }
  }
  if (
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/gcal/callback' ||
    path === '/api/auth/google/login' ||
    path === '/api/auth/google/callback' ||
    path === '/api/auth/album-verify' ||
    path === '/api/wa/webhook'
  ) {
    return next();
  }
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1] || null;
  if (!token) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Token tidak ada' } }, 401);
  }
  const payload = verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Token invalid' } }, 401);
  }
  // Sesi aktif: tolak token tanpa jti aktif (logout / revoke / kedaluwarsa).
  const active = await verifySessionActive(c.env, payload.jti, payload.userId);
  if (!active) {
    return c.json({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Sesi tidak aktif' } }, 401);
  }
  c.set('userId', payload.userId);
  c.set('role', payload.role);

  // Konteks grup keluarga: data aplikasi dipisah per grup, hak tulis per peran.
  const row = await c.env.DB.prepare(
    'SELECT group_id, group_role FROM users WHERE id = ?'
  ).bind(payload.userId).first() as { group_id: string | null; group_role: string | null } | null;
  c.set('groupId', row?.group_id ?? null);
  c.set('groupRole', row?.group_role ?? 'anak');

  await next();
}

// Bandingkan dua string tanpa membocorkan panjang/isi lewat waktu eksekusi.
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
