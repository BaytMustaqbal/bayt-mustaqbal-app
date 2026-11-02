import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Env } from '../types/env';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
