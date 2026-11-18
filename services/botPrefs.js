/**
 * Preferensi AI & baca struk (kembaran botPrefs.js di wa-bot). Disimpan di
 * tabel settings, key "ai_prefs", dibaca runtime app. Tidak perlu redeploy
 * app untuk toggle/angka/persona. Normalisasi murni ada di utils/aiPrefs.js.
 */
import { settingsApi } from './client';
export { AI_PREFS_DEFAULTS, normalizeAiPrefs, resolveAiPrefsFor } from '../utils/aiPrefs';

import { AI_PREFS_DEFAULTS as _D, normalizeAiPrefs as _N } from '../utils/aiPrefs';

/** Ambil ai_prefs dari server (yang sudah dipakai untuk notif_prefs). */
export async function fetchAiPrefs() {
  try {
    const rows = await settingsApi.fetchAll();
    const row = Array.isArray(rows) ? rows.find((s) => s.key === 'ai_prefs') : null;
    return _N(row?.value ?? null);
  } catch {
    return { ..._D, members: {} };
  }
}
