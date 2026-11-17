/**
 * Preferensi AI & baca struk (kembaran botPrefs.js di wa-bot). Disimpan di
 * tabel settings, key "ai_prefs", dibaca runtime app. Tidak perlu redeploy
 * app untuk toggle/angka/persona.
 *
 * Bentuk penuh: { chatEnabled, receiptScanEnabled, summaryItems, persona,
 * style, maxSentences, members: { <userId>: { persona, style, maxSentences } } }.
 * Field di `members` menimpa default keluarga untuk persona/gaya/kalimat
 * saja; toggle & jumlah item tetap berlaku satu keluarga.
 */
import { settingsApi } from './client';

export const AI_PREFS_DEFAULTS = {
  chatEnabled: true,
  receiptScanEnabled: true,
  summaryItems: 5,
  persona: 'Neuro',
  style: 'santai',
  maxSentences: 3,
  members: {},
};

const STYLE_SET = new Set(['santai', 'hangat', 'formal', 'profesional']);

const clampInt = (v, min, max, fallback) => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const normalizeStyle = (v) => (STYLE_SET.has(String(v || '').toLowerCase()) ? String(v).toLowerCase() : undefined);
const personaOf = (v) => String(v ?? '').trim().slice(0, 40) || undefined;
const intOrUndefined = (v, min, max) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};

/** Normalisasi satu entri override; harus lengkap (persona, style, maxSentences). */
function normalizeMemberOverride(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const persona = personaOf(raw.persona);
  const style = normalizeStyle(raw.style);
  const maxSentences = intOrUndefined(raw.maxSentences, 1, 6);
  if (!persona || !style || maxSentences == null) return null;
  return { persona, style, maxSentences };
}

export function normalizeAiPrefs(raw) {
  let p = raw;
  if (typeof raw === 'string') {
    try { p = JSON.parse(raw); } catch { p = null; }
  }
  if (!p || typeof p !== 'object') return { ...AI_PREFS_DEFAULTS, members: {} };
  const persona = personaOf(p.persona) || AI_PREFS_DEFAULTS.persona;
  const style = normalizeStyle(p.style) || AI_PREFS_DEFAULTS.style;
  const members = {};
  if (p.members && typeof p.members === 'object') {
    for (const [key, value] of Object.entries(p.members)) {
      const id = String(key).trim().slice(0, 64);
      const override = normalizeMemberOverride(value);
      if (id && override) members[id] = override;
    }
  }
  return {
    chatEnabled: p.chatEnabled !== false,
    receiptScanEnabled: p.receiptScanEnabled !== false,
    summaryItems: clampInt(p.summaryItems, 1, 10, AI_PREFS_DEFAULTS.summaryItems),
    persona,
    style,
    maxSentences: clampInt(p.maxSentences, 1, 6, AI_PREFS_DEFAULTS.maxSentences),
    members,
  };
}

/** Efektif untuk satu anggota: override menimpa persona/gaya/kalimat. */
export function resolveAiPrefsFor(prefs, userId) {
  const base = prefs && typeof prefs === 'object' && 'chatEnabled' in prefs ? prefs : normalizeAiPrefs(prefs);
  if (!userId) return base;
  const override = base.members?.[String(userId)];
  if (!override) return base;
  return { ...base, persona: override.persona, style: override.style, maxSentences: override.maxSentences };
}

/** Ambil ai_prefs dari server (yang sudah dipakai untuk notif_prefs). */
export async function fetchAiPrefs() {
  try {
    const rows = await settingsApi.fetchAll();
    const row = Array.isArray(rows) ? rows.find((s) => s.key === 'ai_prefs') : null;
    return normalizeAiPrefs(row?.value ?? null);
  } catch {
    return { ...AI_PREFS_DEFAULTS, members: {} };
  }
}
