export function digits(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/** Normalisasi ke 628... */
export function normalizePhone(raw) {
  let p = digits(raw);
  if (!p) return '';
  if (p.startsWith('0')) return '62' + p.slice(1);
  if (p.startsWith('620')) return '62' + p.slice(3);
  if (p.startsWith('62')) return p;
  return '62' + p;
}

/** Nomor sender Fonnte/WA mungkin variasi; cocokkan dengan kandidat user. */
export function samePhone(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return !!na && na === nb;
}
