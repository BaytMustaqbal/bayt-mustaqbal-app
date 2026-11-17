import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Env } from '../types/env';


/* Password hashing: PBKDF2 via WebCrypto (native, cepat) sebagai skema utama.
   Hash lama (bcrypt) tetap bisa diverifikasi (dual-verify) dan otomatis
   di-upgrade ke PBKDF2 saat login berhasil. Format: pbkdf2$<iters>$<saltB64u>$<hashB64u>. */
const PBKDF2_ITERS = 100_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_HASH = 'SHA-256';

const b64urlEnc = (bytes: Uint8Array): string => {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlDec = (s: string): Uint8Array => {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};
const pbkdf2Key = async (password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: PBKDF2_HASH, salt: salt as unknown as BufferSource, iterations },
    key,
    PBKDF2_KEYLEN * 8,
  );
  return new Uint8Array(bits);
};

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Key(password, salt, PBKDF2_ITERS);
  return `pbkdf2$${PBKDF2_ITERS}$${b64urlEnc(salt)}$${b64urlEnc(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;
    const salt = b64urlDec(parts[2] || '');
    const expected = b64urlDec(parts[3] || '');
    const got = await pbkdf2Key(password, salt, iterations);
    if (got.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
    return diff === 0;
  }
  return bcrypt.compare(password, stored);
}

/**
 * Verifikasi password. Bila hash lama (bcrypt) cocok, kembalikan hash PBKDF2
 * pengganti agar caller bisa menulis ulang (login berikutnya cepat).
 */
export async function verifyAndUpgrade(
  password: string,
  stored: string,
): Promise<{ ok: boolean; upgradedHash?: string }> {
  if (stored.startsWith('pbkdf2$')) {
    return { ok: await verifyPassword(password, stored) };
  }
  const ok = await bcrypt.compare(password, stored);
  if (!ok) return { ok: false };
  return { ok: true, upgradedHash: await hashPassword(password) };
}

export function signToken(
  payload: { userId: string; role: string },
  secret: string,
  jti?: string
): string {
  return jwt.sign({ ...payload, ...(jti ? { jti } : {}) }, secret, { expiresIn: '7d' });
}

export function verifyToken(
  token: string,
  secret: string
): { userId: string; role: string; jti?: string } | null {
  try {
    return jwt.verify(token, secret) as { userId: string; role: string; jti?: string };
  } catch {
    return null;
  }
}

/** Catat sesi baru, kembalikan jti untuk JWT. */
export async function createSession(env: Env, userId: string, device = ''): Promise<string> {
  const jti = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, jti, device, created_at, last_seen, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(jti, userId, jti, device, now.toISOString(), now.toISOString(), expiresAt)
    .run();
  return jti;
}

/** Periksa apakah sesi dengan jti ini masih aktif (belum void & belum kedaluwarsa). */
export async function verifySessionActive(
  env: Env,
  jti: string | undefined,
  userId: string
): Promise<boolean> {
  if (!jti) return false;
  const row = (await env.DB.prepare(
    `SELECT id FROM sessions WHERE user_id = ? AND jti = ? AND void IS NULL AND expires_at > ?`
  )
    .bind(userId, jti, new Date().toISOString())
    .first()) as { id: string } | null;
  return !!row;
}

/** Void satu sesi berdasarkan jti (logout / revoke). */
export async function voidSessionByJti(env: Env, jti: string): Promise<void> {
  await env.DB.prepare('UPDATE sessions SET void = ? WHERE jti = ?')
    .bind(new Date().toISOString(), jti)
    .run();
}

/** Void semua sesi milik user (opsional, untuk "keluar semua"). */
export async function voidAllSessions(env: Env, userId: string): Promise<void> {
  await env.DB.prepare('UPDATE sessions SET void = ? WHERE user_id = ? AND void IS NULL')
    .bind(new Date().toISOString(), userId)
    .run();
}
