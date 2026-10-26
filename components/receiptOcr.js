// Pembantu hasil OCR struk (mode semi-auto): sistem MENYARANKAN isi form,
// pengguna tetap mengedit sebelum menyimpan. Murni tanpa React supaya mudah diuji.

const BULAN = {
  jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
  jul: '07', agt: '08', agu: '08', sep: '09', okt: '10', oct: '10',
  nov: '11', des: '12', dec: '12',
};

// Baris yang menunjukkan yang HARUS DIBAYAR (setelah diskon/pajak) -> paling dipercaya
const KUNCI_TOTAL_AKHIR = /\b(grand\s*total|total\s*bayar|harus\s*bayar|total|tagihan|belanja)\b/i;
// Baris sebelum diskon/pajak -> kalah prioritas dari total akhir
const KUNCI_SUBTOTAL = /\b(subtotal|sub\s*total)\b/i;

// Baris yang mirip pola item tapi sebenarnya bukan (tanggal/jam, nomor struk)
const KUNCI_BUKAN_ITEM = /(\d{1,2}:\d{2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|check\s*no|no\s*:|npwp|invoice|struk)/i;

// Baris ini biasanya bukan nama toko (harga / layanan / pajak)
const KUNCI_BUKAN_NAMA = /\b(total|jumlah|bayar|tunai|kartu|debit|kredit|kembali|terima|penerimaan|invoice|struk|no\.|npwp|ppn|pajak|item|qty|harga|subtotal|sub\s*total|kasir|tanggal|waktu|jam|alamat|telp|telpon)\b/i;

// Kandidat angka: "1.234.567" | "150.000,00" | "150000" | "150000,50"
const KOPLIT_ANGKA = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;

// "1.234.567,50" / "150.000" / "150000" -> 150000 (Rp, dibulatkan)
export const angkaKeRp = (mentah) => {
  let s = String(mentah).replace(/\s/g, '');
  if (!/\d/.test(s)) return 0;
  // Buang simbol di luar angka & pemisah ("Rp", ":", dll) supaya parseFloat tidak NaN
  s = s.replace(/[^\d.,]/g, '');
  // Gaya Indonesia: koma + 1-2 digit di akhir = desimal
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  // Sisanya: buang pemisah ribuan (titik/koma yang diikuti tepat 3 digit)
  s = s.replace(/[.,](?=\d{3}(?:\D|$))/g, '');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

// "26/10/2026" | "26-10-26" | "26 Okt 2026" -> "2026-10-26"; kalau tidak ada -> ""
export const tanggalDariTeks = (teks) => {
  const angka = String(teks).match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (angka) {
    let [, d, m, y] = angka;
    if (y.length === 2) y = Number(y) > 70 ? `19${y}` : `20${y}`;
    const mm = String(Number(m)).padStart(2, '0');
    const dd = String(Number(d)).padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) return `${y}-${mm}-${dd}`;
  }
  const huruf = String(teks).match(/(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})/);
  if (huruf) {
    const mm = BULAN[huruf[2].toLowerCase()];
    if (mm) return `${huruf[3]}-${mm}-${String(Number(huruf[1])).padStart(2, '0')}`;
  }
  return '';
};

// Daftar item belanja: [{ nama, harga }] dari baris "qty NamaItem Harga".
// Menjadi sumber nominal paling andal & rincian belanja untuk ditampilkan.
export const daftarItemDariTeks = (teks) =>
  String(teks).split('\n').map((b) => b.trim()).filter(Boolean)
    .map((b) => {
      if (KUNCI_BUKAN_ITEM.test(b)) return null; // tanggal / nomor struk / invoice
      const m = b.match(/^(\d{1,2})\s+(\S.*?)(\d[\d.,]*)\s*$/);
      if (!m) return null; // harus diawali qty lalu ada angka di akhir
      const nama = m[2].trim();
      if (!/[A-Za-z]{2,}/.test(nama)) return null; // nama item harus huruf
      const harga = angkaKeRp(m[3]);
      if (harga < 100 || harga > 10000000) return null;
      return { nama, harga };
    })
    .filter(Boolean);

// Jumlah harga semua item terbaca. Cadangan nominal bila baris Total salah baca
// (item+harga biasanya terbaca lebih jelas daripada baris total yang tipis/blur).
export const jumlahItemDariTeks = (teks) =>
  daftarItemDariTeks(teks).reduce((s, i) => s + i.harga, 0);

// Nominal: utamakan baris berlabel TOTAL; kalau tidak ada, pakai angka terbesar
export const nominalDariTeks = (teks) => {
  const baris = String(teks).split('\n').map((b) => b.trim()).filter(Boolean);
  const nilaiDariBaris = (b) => {
    const kandidat = (b.match(KOPLIT_ANGKA) || []).map(angkaKeRp);
    return kandidat.length ? Math.max(...kandidat) : 0;
  };

  // Kandidat: utamakan baris Total (yang dibayar); Subtotal hanya cadangan.
  let totalAkhir = 0;
  let subtotal = 0;
  for (const b of baris) {
    const n = nilaiDariBaris(b);
    if (n <= 0) continue;
    if (KUNCI_TOTAL_AKHIR.test(b)) { if (n > totalAkhir) totalAkhir = n; }
    else if (KUNCI_SUBTOTAL.test(b)) { if (n > subtotal) subtotal = n; }
  }
  const kandidatTotal = totalAkhir > 0 ? totalAkhir : subtotal;

  // Jumlah item: cadangan bila baris Total salah baca (kehilangan digit membuat
  // total aneh kecil, mis. "Total: 350" padahal struk 43.500). Total dianggap
  // wajar selama tidak jauh lebih kecil dari jumlah item; diskon besar tetap
  // dihormati (total > 20% jumlah item dianggap sah).
  const jumlahItem = jumlahItemDariTeks(teks);
  if (kandidatTotal > 0 && jumlahItem > 0) {
    if (kandidatTotal >= jumlahItem * 0.2) return kandidatTotal;
    return jumlahItem;
  }
  if (kandidatTotal > 0) return kandidatTotal;
  if (jumlahItem > 0) return jumlahItem;

  // Cadangan: angka terbesar, kecuali angka tahun (19xx/20xx) di baris tanggal
  let terbesar = 0;
  for (const b of baris) {
    const lewatTanggal = /\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/.test(b) || /[A-Za-z]{3,}\.?\s+\d{4}/.test(b);
    const n = nilaiDariBaris(b);
    if (n > terbesar && !(lewatTanggal && n >= 1900 && n <= 2099)) terbesar = n;
  }
  return terbesar;
};

// Nama toko / deskripsi: baris pertama yang wajar, bukan baris harga
export const deskripsiDariTeks = (teks) => {
  const baris = String(teks).split('\n').map((b) => b.trim()).filter(Boolean);
  for (const b of baris) {
    if (!/[A-Za-z]{3,}/.test(b)) continue; // harus ada huruf
    if (KUNCI_BUKAN_NAMA.test(b)) continue;
    if (b.length < 3 || b.length > 45) continue;
    return b;
  }
  return '';
};

// Satu panggilan: hasil lengkap saran isian form
export const saranDariTeks = (teks) => ({
  description: deskripsiDariTeks(teks),
  amount: nominalDariTeks(teks),
  date: tanggalDariTeks(teks),
});
