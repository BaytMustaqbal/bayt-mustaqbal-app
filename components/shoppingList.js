/* Daftar Belanja bulanan: helper murni (tanpa React).
   Data disimpan sebagai catatan kategori `belanja` supaya tidak ada sumber
   data kedua. Backend note hanya punya title/content/category/important,
   jadi item (nama, qty, harga, centang) ditulis sebagai JSON di `content`.
   Catatan berpenanda di bawah disembunyikan dari tab Catatan agar JSON-nya
   tidak tampil mentah. */

export const SHOPPING_CATEGORY = 'belanja';
export const SHOPPING_MONTH_PREFIX = 'Daftar Belanja · ';
export const SHOPPING_TEMPLATE_TITLE = 'Template Daftar Belanja';

export const monthTitle = (monthKey) => `${SHOPPING_MONTH_PREFIX}${monthKey}`;

// Catatan khusus (bulanan atau template) yang dikelola halaman Daftar Belanja.
export const isShoppingNote = (note) => {
  if (!note || note.category !== SHOPPING_CATEGORY) return false;
  const title = note.title || '';
  return title.startsWith(SHOPPING_MONTH_PREFIX) || title === SHOPPING_TEMPLATE_TITLE;
};

export const emptyShopping = () => ({ v: 1, items: [], selesai: false, expenseId: null });

// Baca `content` JSON dengan aman. Bentuk salah/kosong = daftar kosong,
// bukan crash. Nilai dinormalisasi supaya hitungan total tidak NaN.
export const parseShoppingNote = (note) => {
  if (!note || !note.body) return emptyShopping();
  try {
    const parsed = JSON.parse(note.body);
    if (!parsed || !Array.isArray(parsed.items)) return emptyShopping();
    return {
      v: 1,
      items: parsed.items.map((it, i) => ({
        id: String(it.id || `item-${i}`),
        nama: String(it.nama || ''),
        qty: Math.max(1, Number(it.qty) || 1),
        harga: Math.max(0, Number(it.harga) || 0),
        checked: !!it.checked,
      })),
      selesai: !!parsed.selesai,
      expenseId: parsed.expenseId ? String(parsed.expenseId) : null,
    };
  } catch {
    return emptyShopping();
  }
};

export const serializeShopping = (state) =>
  JSON.stringify({
    v: 1,
    items: (state.items || []).map(({ id, nama, qty, harga, checked }) => ({
      id,
      nama,
      qty: Math.max(1, Number(qty) || 1),
      harga: Math.max(0, Number(harga) || 0),
      checked: !!checked,
    })),
    selesai: !!state.selesai,
    expenseId: state.expenseId || null,
  });

export const itemSubtotal = (item) =>
  (Math.max(1, Number(item?.qty) || 1)) * (Math.max(0, Number(item?.harga) || 0));

export const sumItems = (items, onlyChecked = false) =>
  (items || [])
    .filter((it) => !onlyChecked || it.checked)
    .reduce((total, it) => total + itemSubtotal(it), 0);

export const progressOf = (items) => {
  const list = items || [];
  const done = list.filter((it) => it.checked).length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
};

let itemSeq = 0;
export const newShoppingItem = ({ nama, qty, harga }) => ({
  id: `item-${Date.now()}-${itemSeq++}`,
  nama: String(nama || '').trim(),
  qty: Math.max(1, Number(qty) || 1),
  harga: Math.max(0, Number(harga) || 0),
  checked: false,
});

// Salin item template ke bulan baru: centang direset supaya bulan ini
// benar-benar mulai dari nol.
export const copyForMonth = (items) =>
  (items || []).map((it) => ({ ...newShoppingItem(it), nama: it.nama }));

// Simpan sebagai template: item tetap, status centang dibuang.
export const toTemplateItems = (items) =>
  (items || []).map((it) => ({ ...newShoppingItem(it), nama: it.nama }));
