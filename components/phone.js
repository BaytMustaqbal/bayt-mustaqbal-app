/* Format nomor telepon keluarga.
 *
 * Simpanan database: format internasional tanpa "+", mis. 628123456789.
 * Tampilan UI: format lokal yang biasa dipakai, mis. 0812-3456-7890.
 */

/** Buang semua karakter selain angka. */
const digits = (raw) => String(raw || '').replace(/\D/g, '');

/** 08... / +62... / 62... -> 628... (tanpa "+"). Kosong -> ''. */
export function normalizePhone(raw) {
  let p = digits(raw);
  if (!p) return '';
  if (p.startsWith('0')) return '62' + p.slice(1);
  if (p.startsWith('620')) return '62' + p.slice(3);
  if (p.startsWith('62')) return p;
  return '62' + p;
}

/** Tampilkan 628123456789 sebagai 0812-3456-7890. */
export function formatPhoneDisplay(raw) {
  let p = digits(raw);
  if (!p) return '';
  if (p.startsWith('62')) p = '0' + p.slice(2);
  else if (!p.startsWith('0')) p = '0' + p;
  if (p.length > 8) return `${p.slice(0, 4)}-${p.slice(4, 8)}-${p.slice(8)}`;
  if (p.length > 4) return `${p.slice(0, 4)}-${p.slice(4)}`;
  return p;
}
