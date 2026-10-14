// Kategori agenda & keuangan — satu sumber kebenaran.
// Dipakai oleh: dropdown tombol Agenda/Keuangan (Navigation) + chip filter (App)
// + ikon tile kartu (ScheduleItem, ExpenseCard).
// Kalau nanti backend (Worker + D1) siap, tabel agenda/expense tinggal memakai `category` ini.

export const AGENDA_CATEGORIES = [
  { id: 'semua', label: 'Semua Agenda', icon: 'calendar' },
  { id: 'keluarga', label: 'Keluarga', icon: 'heart' },
  { id: 'anak', label: 'Anak', icon: 'child' },
  { id: 'ibadah', label: 'Ibadah', icon: 'sparkles' },
  { id: 'kesehatan', label: 'Kesehatan', icon: 'activity' },
  { id: 'rumahtangga', label: 'Rumah Tangga', icon: 'wrench' },
  { id: 'kendaraan', label: 'Kendaraan', icon: 'car' },
];

export const FINANCE_CATEGORIES = [
  { id: 'semua', label: 'Semua Pengeluaran', icon: 'wallet' },
  { id: 'belanja', label: 'Belanja Bulanan', icon: 'shoppingBag' },
  { id: 'utilitas', label: 'Utilitas', icon: 'zap' },
  { id: 'pendidikan', label: 'Pendidikan', icon: 'book' },
  { id: 'transportasi', label: 'Transportasi', icon: 'car' },
  { id: 'kesehatan', label: 'Kesehatan', icon: 'activity' },
  { id: 'ibadah', label: 'Ibadah & Sosial', icon: 'handCoins' },
  { id: 'rumah', label: 'Rumah & Cicilan', icon: 'home' },
  { id: 'hiburan', label: 'Hiburan & Liburan', icon: 'sparkles' },
  { id: 'tabungan', label: 'Tabungan & Utang', icon: 'trendingUp' },
];

// --- Tiga keranjang anggaran (rumus 50/30/20) ---
// Dipakai halaman Anggaran (sub-tab Keuangan). Murni label + ikon: nominalnya
// dihitung dari `budget.ratios`, bukan disimpan (lihat components/budget.js).
export const BUCKETS = [
  { id: 'needs', label: 'Kebutuhan', icon: 'home' },
  { id: 'wants', label: 'Keinginan', icon: 'sparkles' },
  { id: 'savings', label: 'Tabungan & Utang', icon: 'trendingUp' },
];

// Peta kategori keuangan → keranjang. Hanya default: satu pengeluaran boleh
// menimpanya lewat field `bucket` (atau 'auto' untuk kembali ke peta ini).
// `ibadah` (zakat/infak) tidak ada di rumus 50/30/20 → masuk Kebutuhan.
export const CATEGORY_BUCKET = {
  belanja: 'needs',
  utilitas: 'needs',
  pendidikan: 'needs',
  transportasi: 'needs',
  kesehatan: 'needs',
  ibadah: 'needs',
  rumah: 'needs',
  hiburan: 'wants',
  tabungan: 'savings',
};

export const DEFAULT_BUCKET = 'needs';

// Keranjang sebuah pengeluaran: timpaan manual menang; 'auto'/kosong → peta
// kategori; kategori tak dikenal → Kebutuhan (jangan pernah `undefined`).
export const bucketOf = (item) => {
  const manual = item && item.bucket;
  if (manual && manual !== 'auto') return manual;
  return CATEGORY_BUCKET[item && item.category] || DEFAULT_BUCKET;
};

export const getBucketMeta = (id) => BUCKETS.find((b) => b.id === id) || BUCKETS[0];

// Bagian modul "Keluarga". Modul ini = **papan profil anggota** (data diri,
// info medis ringkas, kontak darurat, dokumen penting). Jadwal & biaya anak
// (SPP, les, imunisasi) BUKAN di sini — sudah punya rumah di Agenda & Keuangan.
// Lihat docs/04-KEPUTUSAN-TERKUNCI.md D17.
export const FAMILY_CATEGORIES = [
  { id: 'semua', label: 'Semua Keluarga', icon: 'users' },
  { id: 'anggota', label: 'Anggota', icon: 'userCheck' },
  { id: 'medis', label: 'Info Medis', icon: 'activity' },
  { id: 'kontak', label: 'Kontak & Darurat', icon: 'phone' },
  { id: 'dokumen', label: 'Dokumen Penting', icon: 'file' },
];

// Filter tugas — status & prioritas jadi satu daftar pilihan (dropdown & chip).
// id prioritas = nilai `priority` di data tugas (high/medium/low), label tetap Indonesia.
export const TASK_FILTERS = [
  { id: 'semua', label: 'Semua Tugas', icon: 'tasks' },
  { id: 'belum', label: 'Belum Selesai', icon: 'clock' },
  { id: 'selesai', label: 'Sudah Selesai', icon: 'circleCheck' },
  { id: 'high', label: 'Prioritas Tinggi', icon: 'alertTriangle' },
  { id: 'medium', label: 'Prioritas Sedang', icon: 'target' },
  { id: 'low', label: 'Prioritas Rendah', icon: 'arrowDownRight' },
];

export const getCategoryMeta = (categories, id) => categories.find((c) => c.id === id);

// Catatan keluarga — kategori yang bisa disimpan (tanpa "semua"/"penting").
export const NOTE_CATEGORIES = [
  { id: 'belanja', label: 'Daftar Belanja', icon: 'shoppingBag' },
  { id: 'rumah', label: 'Rumah & Alat', icon: 'wrench' },
  { id: 'dapur', label: 'Dapur & Resep', icon: 'utensils' },
  { id: 'info', label: 'Ide & Info', icon: 'sparkles' },
];

// Filter catatan untuk dropdown & chip. `penting` = catatan yang disematkan
// (flag `pinned`), sisanya kategori biasa.
export const NOTES_FILTERS = [
  { id: 'semua', label: 'Semua Catatan', icon: 'note' },
  { id: 'penting', label: 'Penting', icon: 'pin' },
  ...NOTE_CATEGORIES,
];

// Jumlah item per kategori. `semua` = total.
export const countByCategory = (items, id) => {
  if (!Array.isArray(items)) return 0;
  if (id === 'semua') return items.length;
  return items.filter((item) => item.category === id).length;
};

// Jumlah catatan per filter. `semua` = total; `penting` = disematkan; lainnya = kategori.
export const countByNoteFilter = (items, id) => {
  if (!Array.isArray(items)) return 0;
  if (id === 'semua') return items.length;
  if (id === 'penting') return items.filter((n) => n.pinned).length;
  return items.filter((n) => n.category === id).length;
};

// Jumlah tugas per filter. `semua` = total; belum/selesai = status; lainnya = prioritas.
export const countByTaskFilter = (items, id) => {
  if (!Array.isArray(items)) return 0;
  if (id === 'semua') return items.length;
  if (id === 'belum') return items.filter((t) => !t.completed).length;
  if (id === 'selesai') return items.filter((t) => t.completed).length;
  return items.filter((t) => t.priority === id).length;
};