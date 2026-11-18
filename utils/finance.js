// Helper keuangan murni — dipakai App.jsx (render Keuangan) dan bisa diuji unit.
// Sumber kebenaran: App.jsx sebelumnya mendefinisikan ini inline.

const pad2 = (n) => String(n).padStart(2, '0');
const monthLabel = (d) => new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d).replace('.', '');

// 6-bulan tren pengeluaran dari expenses.
export function computeMonthlyTrend(expenses) {
  const months = {};
  (expenses || []).forEach((e) => {
    if (!e) return;
    const m = (e.date || '').slice(0, 7);
    months[m] = (months[m] || 0) + (Number(e.amount) || 0);
  });
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    result.push({ label: monthLabel(d), value: months[key] || 0 });
  }
  return result;
}

// Distribusi mingguan dari expenses (berdasarkan hari). Minggu=0, Senin=1, ... Sabtu=6.
export function computeWeekly(expenses) {
  const days = Array(7).fill(0);
  (expenses || []).forEach((e) => {
    if (!e) return;
    const d = new Date((e.date || '').replace(/-/g, '/'));
    if (!Number.isNaN(d.getTime())) {
      days[d.getDay()] += Number(e.amount) || 0;
    }
  });
  return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((label, i) => ({
    label: label,
    value: days[(i + 1) % 7],
  }));
}

// Donut chart: agregat per kategori. Dipakai pengeluaran (default) & pemasukan
// (lewat parameter daftar kategori + peta warna).
const DEFAULT_COLOR_MAP = {
  rumah: 'rgb(var(--chart8))',
  cicilan: 'rgb(var(--chart3))',
  hiburan: 'rgb(var(--chart7))',
  belanja: 'rgb(var(--chart1))',
  kuliner: 'rgb(var(--chart2))',
  hobi: 'rgb(var(--chart4))',
  tabungan: 'rgb(var(--chart9))',
  pendidikan: 'rgb(var(--chart2))',
  utilitas: 'rgb(var(--chart3))',
  ibadah: 'rgb(var(--chart4))',
  transportasi: 'rgb(var(--chart5))',
  kesehatan: 'rgb(var(--chart6))',
};

export function computeCategories(items, categories, colorMap) {
  const COLOR_MAP = colorMap || DEFAULT_COLOR_MAP;
  const totals = {};
  (items || []).forEach((e) => {
    if (!e) return;
    const cat = e.category || 'lainnya';
    totals[cat] = (totals[cat] || 0) + (Number(e.amount) || 0);
  });
  const LABEL_MAP = {};
  (categories || []).forEach((c) => { if (c && c.id !== 'semua') LABEL_MAP[c.id] = c.label; });
  return Object.entries(totals)
    .map(([cat]) => ({
      label: LABEL_MAP[cat] || cat,
      value: totals[cat],
      color: COLOR_MAP[cat] || 'rgb(var(--chart1))',
    }))
    .sort((a, b) => b.value - a.value);
}

// Status anggaran: aman (<80%), hati-hati (80-100%), lewat (>100%).
// Anggaran belum diisi → 'belum' (bukan 0% yang menyesatkan).
export function budgetStatus(expense, budgetIncome) {
  const total = Number(budgetIncome) || 0;
  if (total <= 0) return { level: 'belum', pct: 0, sisa: 0 };
  const pct = Math.round((expense / total) * 100);
  const level = expense > total ? 'lewat' : pct >= 80 ? 'hati-hati' : 'aman';
  return { level, pct, sisa: total - expense };
}

/** Key bulan YYYY-MM dari sebuah Date. */
export const monthKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

/** Nama bulan panjang (mis. "November 2026"). */
export const monthName = (d) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);

/** Nama bulan panjang dari key "YYYY-MM". */
export const monthNameLong = (key) => {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return monthName(new Date());
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};

/** Tren berpasangan 6 bulan TERAKHIR dari bulan acuan (bukan selalu bulan ini),
    supaya Kakang bisa meninjau bulan lalu lengkap dengan konteks 6 bulannya. */
export const buildPairedTrend = (expenses, income, endKey) => {
  const [y, m] = String(endKey).split('-').map(Number);
  const sumBy = (list) => {
    const t = {};
    (list || []).forEach((i) => {
      if (!i) return;
      const k = (i.date || '').slice(0, 7);
      if (k) t[k] = (t[k] || 0) + (Number(i.amount) || 0);
    });
    return t;
  };
  const te = sumBy(expenses);
  const ti = sumBy(income);
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const key = monthKeyOf(d);
    out.push({ label: monthLabel(d), key, income: ti[key] || 0, expense: te[key] || 0 });
  }
  return out;
};
