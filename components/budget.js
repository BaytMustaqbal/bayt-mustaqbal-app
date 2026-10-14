// Logika anggaran (rumus 50/30/20) — murni, tanpa React.
// Dipakai: halaman Anggaran (components/Budgeting.jsx), Dashboard, dan header Keuangan.
//
// Prinsip (lihat docs/superpowers/specs/2026-10-14-anggaran-budgeting-design.md):
// - Semua angka anggaran TURUNAN: yang disimpan hanya `income`, `ratios`, dan `pos`.
//   Alokasi/realisasi dihitung saat render → tidak ada angka kedua yang bisa
//   berbeda dari sumbernya (pelajaran D21).
// - Snapshot `localStorage` lama (budget masih `{ total, month }`) harus tetap
//   jalan → semua nilai punya cadangan, dan hanya di berkas ini.

import { bucketOf } from './categories';

export const DEFAULT_RATIOS = { needs: 50, wants: 30, savings: 20 };
export const DEFAULT_MONTH = 'Oktober 2026';
export const BUCKET_IDS = ['needs', 'wants', 'savings'];

// Pos saran bawaan (label saja — tanpa nominal, tanpa centang).
// Kalau Kakang mengubah daftarnya di app, yang tersimpan adalah daftar miliknya.
export const DEFAULT_POS = {
  needs: [
    { id: 'n1', label: 'Cicilan rumah/sewa' },
    { id: 'n2', label: 'Belanja bahan makanan & beras' },
    { id: 'n3', label: 'Tagihan utilitas (listrik/air/internet)' },
    { id: 'n4', label: 'Transportasi (BBM/angkutan umum)' },
    { id: 'n5', label: 'Sekolah anak' },
    { id: 'n6', label: 'Asuransi kesehatan' },
  ],
  wants: [
    { id: 'w1', label: 'Makan di luar/hangout' },
    { id: 'w2', label: 'Hobi & hiburan' },
    { id: 'w3', label: 'Langganan streaming' },
    { id: 'w4', label: 'Liburan/travelling' },
  ],
  savings: [
    { id: 's1', label: 'Dana darurat (target 3–6× pengeluaran bulanan)' },
    { id: 's2', label: 'Tabungan' },
    { id: 's3', label: 'Investasi' },
    { id: 's4', label: 'Pembayaran cicilan/utang' },
  ],
};

// Angka positif yang aman. Apa pun yang aneh (kosong, negatif, NaN, ∞, teks)
// jatuh ke 0 — supaya tidak pernah ada `NaN` di layar.
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Bilangan bulat 0–100 dari input form (angka atau teks angka). Teks kosong
// dianggap tidak sah — bukan 0 — supaya kolom yang belum diisi kelihatan salah.
const toInt = (value) => {
  if (value === '' || value === null || value === undefined) return NaN;
  return Number(value);
};

// `budget` lengkap dengan nilai cadangan. Satu-satunya tempat snapshot lama
// dijembatani: `income` jatuh ke `total` (angka lama), rasio & pos ke bawaan.
export function getBudget(data) {
  const raw = (data && data.budget) || {};
  return {
    month: raw.month || DEFAULT_MONTH,
    income: num(raw.income ?? raw.total),
    ratios: { ...DEFAULT_RATIOS, ...(raw.ratios || {}) },
    pos: { ...DEFAULT_POS, ...(raw.pos || {}) },
  };
}

// Alokasi tiap keranjang dari gaji × rasio. Gaji 0/kosong → semua 0 (bukan NaN).
export function allocate(income, ratios) {
  const total = num(income);
  if (total <= 0) return { needs: 0, wants: 0, savings: 0 };
  const r = ratios || DEFAULT_RATIOS;
  return {
    needs: Math.round((total * num(r.needs)) / 100),
    wants: Math.round((total * num(r.wants)) / 100),
    savings: Math.round((total * num(r.savings)) / 100),
  };
}

// Status keranjang. Selalu dipasangkan ikon + teks di UI (bukan warna saja).
// Alokasi 0 tapi ada realisasi = tetap "lebih" (sedang melebihi anggaran).
export function statusOf(realisasi, alokasi) {
  const r = num(realisasi);
  const a = num(alokasi);
  if (a <= 0) return r > 0 ? 'lebih' : 'aman';
  if (r > a) return 'lebih';
  if (r > a * 0.8) return 'hati-hati';
  return 'aman';
}

// Rasio sah: tiga bilangan bulat 0–100 yang jumlahnya tepat 100.
export function ratiosValid(ratios) {
  if (!ratios) return false;
  const values = BUCKET_IDS.map((id) => toInt(ratios[id]));
  if (!values.every((v) => Number.isInteger(v) && v >= 0 && v <= 100)) return false;
  return values.reduce((sum, v) => sum + v, 0) === 100;
}

// Ringkasan satu bulan: alokasi vs realisasi per keranjang + totalnya.
export function summarize(expenses, budget) {
  const b = budget && budget.ratios ? budget : getBudget({ budget });
  const alokasi = allocate(b.income, b.ratios);

  const realisasi = { needs: 0, wants: 0, savings: 0 };
  const jumlah = { needs: 0, wants: 0, savings: 0 };

  (expenses || []).forEach((item) => {
    const bucket = bucketOf(item);
    realisasi[bucket] += num(item && item.amount);
    jumlah[bucket] += 1;
  });

  const selisih = {};
  const status = {};
  BUCKET_IDS.forEach((id) => {
    selisih[id] = alokasi[id] - realisasi[id];
    status[id] = statusOf(realisasi[id], alokasi[id]);
  });

  return {
    alokasi,
    realisasi,
    jumlah,
    selisih,
    status,
    total: {
      alokasi: BUCKET_IDS.reduce((sum, id) => sum + alokasi[id], 0),
      realisasi: BUCKET_IDS.reduce((sum, id) => sum + realisasi[id], 0),
      selisih: BUCKET_IDS.reduce((sum, id) => sum + selisih[id], 0),
    },
  };
}
