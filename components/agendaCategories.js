// Kategori agenda — satu sumber kebenaran.
// Dipakai oleh: dropdown tombol Agenda (Navigation) + chip filter (App).
// Kalau nanti backend (Worker + D1) siap, tabel agenda tinggal memakai `category` ini.
export const AGENDA_CATEGORIES = [
  { id: 'semua', label: 'Semua Agenda', icon: 'calendar' },
  { id: 'keluarga', label: 'Agenda Keluarga', icon: 'heart' },
  { id: 'anak', label: 'Agenda Anak', icon: 'child' },
  { id: 'service', label: 'Service Motor', icon: 'wrench' },
  { id: 'lainnya', label: 'Kegiatan Lainnya', icon: 'sparkles' },
];

export const getCategoryMeta = (id) => AGENDA_CATEGORIES.find((c) => c.id === id);

// Jumlah agenda per kategori. `semua` = total.
export const countByCategory = (items, id) => {
  if (!Array.isArray(items)) return 0;
  if (id === 'semua') return items.length;
  return items.filter((item) => item.category === id).length;
};