/**
 * Preferensi AI bot (disimpan di tabel settings, key "ai_prefs", per grup
 * keluarga — kembar dengan notif_prefs). Dibaca runtime oleh bot: tidak
 * perlu redeploy saat Kakang mengubah toggle/angka/persona di app.
 *
 * Bentuk penuh: { chatEnabled, receiptScanEnabled, summaryItems, persona,
 * style, maxSentences, members: { <userId>: { persona, style, maxSentences } } }.
 * Persona/gaya/kalimat bisa berbeda per anggota; toggle dan jumlah item
 * tetap berlaku satu keluarga.
 */

export const DEFAULT_AI_PREFS = {
  /** Balasan AI untuk obrolan umum (chat fallback). */
  chatEnabled: true,
  /** Baca foto struk lewat AI Gemma (app + WA). */
  receiptScanEnabled: true,
  /** Jumlah item rincian yang ditampilkan di ringkasan WA (1-10). */
  summaryItems: 5,
  /** Nama persona bot di prompt sistem (maksimal 40 karakter). */
  persona: 'Neuro',
  /** Gaya bahasa: santai | hangat | formal | profesional. */
  style: 'santai',
  /** Maksimal kalimat balasan AI (1-6). */
  maxSentences: 3,
  /** Override persona/gaya/kalimat per userId (keluarga satu grup). */
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
  if (!p || typeof p !== 'object') return { ...DEFAULT_AI_PREFS, members: {} };
  const persona = personaOf(p.persona) || DEFAULT_AI_PREFS.persona;
  const style = normalizeStyle(p.style) || DEFAULT_AI_PREFS.style;
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
    summaryItems: clampInt(p.summaryItems, 1, 10, DEFAULT_AI_PREFS.summaryItems),
    persona,
    style,
    maxSentences: clampInt(p.maxSentences, 1, 6, DEFAULT_AI_PREFS.maxSentences),
    members,
  };
}

/** Efektif untuk satu anggota: override menimpa persona/gaya/kalimat. */
export function resolveFor(prefs, userId) {
  const base = prefs && typeof prefs === 'object' && 'chatEnabled' in prefs ? prefs : normalizeAiPrefs(prefs);
  if (!userId) return base;
  const override = base.members?.[String(userId)];
  if (!override) return base;
  return { ...base, persona: override.persona, style: override.style, maxSentences: override.maxSentences };
}

let cache = { at: 0, prefs: null };
const CACHE_MS = 45 * 1000;

/** Baca preferensi dari settings; cache 45 detik. Error jatuh ke default. */
export async function readAiPrefs(env) {
  const now = Date.now();
  if (cache.prefs && now - cache.at < CACHE_MS) return cache.prefs;
  let prefs = { ...DEFAULT_AI_PREFS, members: {} };
  try {
    const row = await env.APP_DB.prepare(
      `SELECT value FROM settings WHERE key = 'ai_prefs' AND group_id IS NOT NULL AND void IS NULL ORDER BY updated_at DESC LIMIT 1`
    ).first();
    prefs = normalizeAiPrefs(row?.value);
  } catch {
    prefs = { ...DEFAULT_AI_PREFS, members: {} };
  }
  cache = { at: now, prefs };
  return prefs;
}

/** Parse perintah ganti gaya bahasa lewat WA.
    Mengembalikan { value } (value=null → tampilkan daftar) atau null bila
    teksnya bukan perintah gaya bahasa. Cocok hanya jika seluruh pesan
    adalah perintah pendek, supaya kalimat biasa tidak tertelan. */
const MBR_STYLES = new Set(['santai', 'hangat', 'formal', 'profesional']);

export function parseStyleCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  const m = t.match(/^(?:ubah\s+)?gaya(?:\s+bahasa)?(?:\s+saya)?(?:\s+(?:jadi|ke|menjadi))?\s*:?\s*(santai|hangat|formal|profesional|default|reset)?\s*[.!?]*$/i);
  if (!m) return null;
  const value = (m[1] || '').toLowerCase();
  if (!value) return { value: null };
  return { value: value === 'reset' ? 'default' : value };
}

/** Ubah gaya bahasa milik sendiri di ai_prefs (self). `default`/`reset` menghapus override. */
export async function setMemberStyle(env, user, value) {
  const s = String(value || '').toLowerCase().trim();
  const reset = s === 'default';
  if (!reset && !MBR_STYLES.has(s)) return { ok: false, reason: 'VALUE' };
  if (!env.APP_DB || !user?.id) return { ok: false, reason: 'NO_DB' };

  const scopeSql = user.group_id ? 'group_id = ?' : 'user_id = ?';
  const scopeVal = user.group_id || user.id;
  const now = new Date().toISOString();

  let existing = null;
  try {
    existing = await env.APP_DB.prepare(
      `SELECT id, value FROM settings WHERE key = 'ai_prefs' AND ${scopeSql} AND void IS NULL`
    ).bind(scopeVal).first();
  } catch {
    existing = null;
  }
  let pref = {};
  try { pref = existing?.value ? JSON.parse(existing.value) : {}; } catch { pref = {}; }

  const chatEnabled = pref.chatEnabled !== false;
  const receiptScanEnabled = pref.receiptScanEnabled !== false;
  const summaryItems = clampInt(pref.summaryItems, 1, 10, DEFAULT_AI_PREFS.summaryItems);
  const persona = personaOf(pref.persona) || DEFAULT_AI_PREFS.persona;
  const globalStyle = normalizeStyle(pref.style) || DEFAULT_AI_PREFS.style;
  const maxSentences = clampInt(pref.maxSentences, 1, 6, DEFAULT_AI_PREFS.maxSentences);
  const members = pref.members && typeof pref.members === 'object' ? { ...pref.members } : {};

  if (reset) {
    delete members[user.id];
  } else {
    const prev = members[user.id] && typeof members[user.id] === 'object' ? members[user.id] : {};
    members[user.id] = {
      persona: personaOf(prev.persona) || persona,
      style: s,
      maxSentences: intOrUndefined(prev.maxSentences, 1, 6) ?? maxSentences,
    };
  }

  const next = { chatEnabled, receiptScanEnabled, summaryItems, persona, style: globalStyle, maxSentences, members };
  const value2 = JSON.stringify(next);
  try {
    if (existing) {
      await env.APP_DB.prepare('UPDATE settings SET value = ?, rev = rev + 1, updated_at = ? WHERE id = ?')
        .bind(value2, now, existing.id).run();
    } else {
      const id = crypto.randomUUID();
      await env.APP_DB.prepare(
        'INSERT INTO settings (id, user_id, group_id, key, value, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, user.id, user.group_id || null, 'ai_prefs', value2, 1, now, now).run();
    }
  } catch (e) {
    return { ok: false, reason: e?.message || 'WRITE_FAILED' };
  }
  cache = { at: Date.now(), prefs: normalizeAiPrefs(value2) };
  return { ok: true, reset, style: s, prefs: cache.prefs };
}

/** Susun instruksi gaya untuk system prompt. */
export function styleInstruction(style) {
  switch (String(style || '').toLowerCase()) {
    case 'hangat':
      return 'Jawab hangat dan penuh perhatian, sapa dengan ramah, sisip empati, tetap kasual dan sopan. Gunakan kata "Saya".';
    case 'formal':
      return 'Jawab formal dan baku, sapaan lengkap (Bapak/Ibu), tidak berlebihan. Gunakan kata "Saya".';
    case 'profesional':
      return 'Jawab singkat, lugas, profesional, tanpa basa-basi dan sapaan. Gunakan kata "Saya".';
    default:
      return 'Jawab santai dan ringan, boleh sedikit akrab, tetap membantu dan sopan. Gunakan kata "Saya", jangan "aku" atau "gue".';
  }
}
