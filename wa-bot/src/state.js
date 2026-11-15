import { normalizePhone } from './phone.js';

const PREFIX = 'pending:';
const TTL = 600; // 10 menit

function key(sender) {
  return PREFIX + normalizePhone(sender);
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
