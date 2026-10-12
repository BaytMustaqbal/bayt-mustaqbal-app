// Kategori agenda & keuangan — satu sumber kebenaran.
// Dipakai oleh: dropdown tombol Agenda/Keuangan (Navigation) + chip filter (App)
// + ikon tile kartu (ScheduleItem, ExpenseCard).
// Kalau nanti backend (Worker + D1) siap, tabel agenda/expense tinggal memakai `category` ini.

export const AGENDA_CATEGORIES = [
  { id: 'semua', label: 'Semua Agenda', icon: 'calendar' },
  { id: 'keluarga', label: 'Agenda Keluarga', icon: 'heart' },
  { id: 'anak', label: 'Agenda Anak', icon: 'child' },
  { id: 'service', label: 'Service Motor', icon: 'wrench' },
  { id: 'lainnya', label: 'Kegiatan Lainnya', icon: 'sparkles' },
];

export const FINANCE_CATEGORIES = [
  { id: 'semua', label: 'Semua Pengeluaran', icon: 'wallet' },
  { id: 'belanja', label: 'Belanja Bulanan', icon: 'shoppingBag' },
  { id: 'utilitas', label: 'Utilitas', icon: 'zap' },
  { id: 'pendidikan', label: 'Pendidikan', icon: 'book' },
  { id: 'transportasi', label: 'Transportasi', icon: 'car' },
  { id: 'kesehatan', label: 'Kesehatan', icon: 'activity' },
  { id: 'ibadah', label: 'Ibadah & Sosial', icon: 'handCoins' },
];

export const FAMILY_CATEGORIES = [
  { id: 'semua', label: 'Semua Keluarga', icon: 'users' },
  { id: 'anggota', label: 'Anggota', icon: 'userCheck' },
  { id: 'kesehatan', label: 'Kesehatan', icon: 'activity' },
  { id: 'pendidikan', label: 'Pendidikan Anak', icon: 'book' },
  { id: 'kontak', label: 'Kontak & Darurat', icon: 'phone' },
];

export const getCategoryMeta = (categories, id) => categories.find((c) => c.id === id);

// Jumlah item per kategori. `semua` = total.
export const countByCategory = (items, id) => {
  if (!Array.isArray(items)) return 0;
  if (id === 'semua') return items.length;
  return items.filter((item) => item.category === id).length;
};