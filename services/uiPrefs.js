/**
 * Preferensi tampilan pribadi (per perangkat, disimpan di localStorage).
 * Tidak dikirim ke server — sifatnya personal, sama seperti tema.
 */

const KEY = 'bm-ui-prefs';

export const UI_PREFS_DEFAULTS = {
  /** true = sembunyikan jumlah uang secara default. */
  hideMoneyDefault: true,
  /** 'compact' | 'normal' | 'large' — mengubah font-size root (rem). */
  density: 'normal',
  /** true = mode kompak (padding halaman lebih rapat). */
  compactMode: false,
};

const DENSITY_FONT = { compact: '14px', normal: '16px', large: '17px' };

export function readUiPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...UI_PREFS_DEFAULTS };
    const p = JSON.parse(raw);
    return {
      hideMoneyDefault: p.hideMoneyDefault !== false,
      density: ['compact', 'normal', 'large'].includes(p.density) ? p.density : UI_PREFS_DEFAULTS.density,
      compactMode: p.compactMode === true,
    };
  } catch {
    return { ...UI_PREFS_DEFAULTS };
  }
}

export function writeUiPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* abaikan (private mode, dsb) */
  }
}

/** Terapkan preferensi ke elemen akar (font-size + class kompak). */
export function applyUiPrefs(prefs) {
  const root = document.documentElement;
  root.style.fontSize = DENSITY_FONT[prefs.density] || DENSITY_FONT.normal;
  root.classList.toggle('ui-compact', prefs.compactMode);
}
