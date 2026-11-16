import { normalizePhone } from './phone.js';

const PREFIX = 'pending:';
const TTL = 600; // 10 menit
const UNDO_PREFIX = 'undo:';

function key(sender) {
  return PREFIX + normalizePhone(sender);
}

function undoKey(sender) {
  return UNDO_PREFIX + normalizePhone(sender);
}

export async function getPending(env, sender) {
  if (!env.WA_DEDUPE) return null;
  const raw = await env.WA_DEDUPE.get(key(sender));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setPending(env, sender, action) {
  if (!env.WA_DEDUPE) return;
  await env.WA_DEDUPE.put(key(sender), JSON.stringify(action), { expirationTtl: TTL });
}

export async function clearPending(env, sender) {
  if (!env.WA_DEDUPE) return;
  await env.WA_DEDUPE.delete(key(sender));
}

/** Aksi tulis terakhir yang masih bisa dibatalkan (10 menit). */
export async function setLastAction(env, sender, action) {
  if (!env.WA_DEDUPE || !action) return;
  await env.WA_DEDUPE.put(undoKey(sender), JSON.stringify(action), { expirationTtl: TTL });
}

export async function getLastAction(env, sender) {
  if (!env.WA_DEDUPE) return null;
  const raw = await env.WA_DEDUPE.get(undoKey(sender));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearLastAction(env, sender) {
  if (!env.WA_DEDUPE) return;
  await env.WA_DEDUPE.delete(undoKey(sender));
}

export const UNDO_TTL_MINUTES = TTL / 60;
