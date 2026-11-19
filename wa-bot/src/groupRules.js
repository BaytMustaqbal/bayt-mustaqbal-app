// Aturan balasan bot di grup WhatsApp.
// Dipisah dari index.js supaya bisa diuji tanpa Cloudflare Worker.

export const WRITE_ROLES = new Set(['kepala_keluarga', 'suami', 'istri']);

/** Kembalikan query grup jika pesan diawali "neuro" (case-insensitive).
    Pemisah yang diterima: spasi, koma, titik dua, titik, tanda seru, strip. */
export function groupQueryFrom(text) {
  const t = String(text || '').trim();
  const m = t.match(/^neuro\b[\s,:.!-]*(.*)$/i);
  if (!m) return null;
  return m[1].trim();
}

/** Intent yang boleh dipakai di grup Neuro (baca-saja). */
export const GROUP_READ_INTENTS = new Set([
  'cek_pengingat', 'cek_tagihan', 'agenda_hari_ini', 'saldo_bulan_ini',
  'rangkuman', 'rincian_kategori', 'target_tabungan', 'tanya_data', 'menu',
]);

/** True bila intent hanya membaca data, bukan mencatat. */
export function isGroupReadIntent(intent) {
  return GROUP_READ_INTENTS.has(String(intent || '').trim().toLowerCase());
}

/** Hanya kepala keluarga, suami, dan istri yang boleh dibalas di grup. */
export function canGroupReply(user) {
  if (!user || !user.id) return false;
  return WRITE_ROLES.has(String(user.group_role || '').trim().toLowerCase());
}
