import { Env } from '../types/env';

/**
 * Rate-limit login sederhana (anti brute-force) memakai tabel auth_attempts.
 * Kunci = username|IP. Menolak setelah 5 percobaan gagal dalam 15 menit.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function checkRateLimit(env: Env, key: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
  const row = await env.DB.prepare(
    'SELECT count FROM auth_attempts WHERE rl_key = ? AND window_start > ?'
  ).bind(key, cutoff).first() as { count: number } | null;
  return !row || row.count < MAX_ATTEMPTS;
}

export async function recordFailedAttempt(env: Env, key: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(
    'SELECT id, count FROM auth_attempts WHERE rl_key = ? ORDER BY updated_at DESC LIMIT 1'
  ).bind(key).first() as { id: string; count: number } | null;
  if (existing) {
    const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
    const fresh = await env.DB.prepare(
      'SELECT id FROM auth_attempts WHERE id = ? AND window_start > ?'
    ).bind(existing.id, cutoff).first();
    if (fresh) {
      await env.DB.prepare(
        'UPDATE auth_attempts SET count = count + 1, updated_at = ? WHERE id = ?'
      ).bind(now, existing.id).run();
      return;
    }
  }
  await env.DB.prepare(
    'INSERT INTO auth_attempts (id, rl_key, count, window_start, updated_at) VALUES (?, ?, 1, ?, ?)'
  ).bind(crypto.randomUUID(), key, now, now).run();
}

export async function clearRateLimit(env: Env, key: string): Promise<void> {
  await env.DB.prepare('DELETE FROM auth_attempts WHERE rl_key = ?').bind(key).run();
}
