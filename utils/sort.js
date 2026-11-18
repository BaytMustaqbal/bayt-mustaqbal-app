// Helper sort transaksi — dipakai App.jsx (render daftar pengeluaran/pemasukan)
// dan buildMergedData (saat data dimuat). Dipisah supaya bisa diuji unit.

/** Waktu input transaksi: created_at (backend) → createdAt (draft offline) → ts → ''. */
export function waktuTransaksi(item) {
  return String(item?.created_at || item?.createdAt || item?.ts || '');
}

/** Urutkan transaksi: tanggal terbaru dulu, lalu waktu input terbaru. Tidak mutate input. */
export function urutTransaksiTerbaru(list = []) {
  const arr = Array.isArray(list) ? list : [];
  return [...arr].sort((a, b) => {
    const byDate = String(b?.date || '').localeCompare(String(a?.date || ''));
    if (byDate !== 0) return byDate;
    return waktuTransaksi(b).localeCompare(waktuTransaksi(a));
  });
}
