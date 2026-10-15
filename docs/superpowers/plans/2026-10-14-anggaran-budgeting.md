# Modul Anggaran (Budgeting 50/30/20) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambah sub-tab **Anggaran** di section Keuangan: gaji diinput → otomatis terbagi 50/30/20 → realisasi tiap keranjang dihitung dari pengeluaran nyata.

**Architecture:** Semua angka anggaran **turunan** (dihitung saat render), tidak ada agregat tersimpan. Yang disimpan hanya `budget.income`, `budget.ratios`, `budget.pos`, dan penanda keranjang opsional `bucket` di tiap pengeluaran. Nilai cadangan untuk snapshot lama dikumpulkan di satu helper `getBudget(data)`.

**Tech Stack:** React 18 + Vite 4 + Tailwind (PostCSS). Tanpa dependensi baru. Tanpa `fetch`/backend (aturan proyek).

**Spec:** `docs/superpowers/specs/2026-10-14-anggaran-budgeting-design.md`

## Global Constraints

- **Tanpa dependensi baru** — termasuk tanpa test runner. Verifikasi: `npm run build` + pemeriksaan di dev server `http://localhost:3000` (tab browser yang sudah ada).
- **Tanpa `fetch`/API/DB baru** (AGENT.md). Data tetap `mockData` + snapshot `localStorage`.
- **Invariant D21:** hero = donat = tren Okt = **Rp 10.650.000** (diubah 15 Okt 2026: "Sewa & cicilan rumah" → Rp 5,5 jt); anggaran (gaji) tetap **Rp 8.000.000** → hero "133% · sisa −Rp 2,65 jt" (status "terlewati").
- **Satu sumber angka:** tidak ada alokasi/realisasi yang disimpan di `mockData`.
- **Target sentuh ≥44px**; status keranjang **selalu ikon + teks** (bukan warna saja); **0 overflow horizontal** pada 320/390/768/1280.
- **Bahasa Indonesia** untuk teks UI dan dokumen. Tailwind via PostCSS (bukan CDN).
- **Satu commit per task**, pesan naratif Bahasa Indonesia, `git commit --no-gpg-sign`. **JANGAN `git push`** tanpa perintah eksplisit Kakang.
- Setelah mengubah satu berkas, **sentuh mtime** berkas itu sebelum reload (Vite di Windows pernah menyajikan transform basi).

## Cara verifikasi (terbukti jalan tanpa dependensi)

1. **Logika murni — impor modul langsung dari dev server.** Vite menyajikan modul ESM apa adanya, dan browser bisa mengimpornya. Sudah diuji: mengembalikan objek nyata.
   ```js
   (async () => { const m = await import('/components/budget.js');
     return { alok: m.allocate(8000000, {needs:50,wants:30,savings:20}),
              gin0: m.allocate(0, {needs:50,wants:30,savings:20}) }; })()
   ```
2. **Aritmatika ekspektasi — Node satu baris** (tanpa import):
   `node -e "console.log(1150000+900000+600000+450000+250000+150000+100000)"` → `3600000`
3. **DOM:** angka bertanda `data-budget="…"`, hitung overflow `document.documentElement.scrollWidth - document.documentElement.clientWidth` (harus 0), konsol error 0.
4. **Kegigihan:** reload, dan suntik snapshot `localStorage` lama untuk menguji nilai cadangan.

## Review Focus

Kondisi yang tidak dibahas eksplisit di spec tapi paling mungkin melukai pemakai. Tiap baris punya pemeriksaannya di task pemilik kode:

1. **Snapshot `localStorage` lama** (`budget` masih `{total, month}`) → app tetap normal, `income` jatuh ke `total`. (Task 4)
2. **Gaji 0 / belum diinput** → jangan hasilkan `NaN`/`Infinity`; alokasi 0 + ajakan input. (Task 2, 5)
3. **Rasio tidak sah** (jumlah ≠ 100, negatif, > 100, desimal) → ditolak, tidak disimpan, tidak menghasilkan alokasi negatif. (Task 6)
4. **Pengeluaran tanpa `bucket` / kategori tak dikenal** → masuk `needs`, bukan `undefined` yang jadi `NaN`. (Task 1, 3, 8)
5. **Realisasi > alokasi** (status "Lebih") → angka minus & progress bar >100% tidak merusak layout. (Task 5)

---

### Task 1: Kategori & keranjang di satu sumber

**Files:**
- Modify: `components/categories.js`

**Interfaces:**
- Consumes: —
- Produces: `FINANCE_CATEGORIES` (10 entri: `semua` + 9 kategori), `BUCKETS: [{id,label,icon}]` urutan `needs, wants, savings`, `CATEGORY_BUCKET: {[categoryId]: bucketId}`, `DEFAULT_BUCKET = 'needs'`, `bucketOf(item) -> 'needs'|'wants'|'savings'`, `getBucketMeta(id) -> {id,label,icon}`

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

```js
(async () => { const c = await import('/components/categories.js');
  return { jumlah: c.FINANCE_CATEGORIES.length, adaBucketOf: typeof c.bucketOf }; })()
```
Hasil sekarang: `{ jumlah: 7, adaBucketOf: 'undefined' }`. Yang diharapkan nanti: `{ jumlah: 10, adaBucketOf: 'function' }`.

- [ ] **Step 2: Implementasi di `components/categories.js`**

Tambahkan ke `FINANCE_CATEGORIES` setelah `ibadah`, tepat 3 entri:
`{ id: 'rumah', label: 'Rumah & Cicilan', icon: 'home' }`, `{ id: 'hiburan', label: 'Hiburan & Liburan', icon: 'sparkles' }`, `{ id: 'tabungan', label: 'Tabungan & Utang', icon: 'trendingUp' }`.
Tambahkan `BUCKETS` (label: "Kebutuhan" `home`, "Keinginan" `sparkles`, "Tabungan & Utang" `trendingUp`), `CATEGORY_BUCKET` = `belanja, utilitas, pendidikan, transportasi, kesehatan, ibadah, rumah` → `needs`; `hiburan` → `wants`; `tabungan` → `savings`; `DEFAULT_BUCKET = 'needs'`.
`bucketOf(item)`: pakai `item.bucket` bila ada **dan bukan** `'auto'`; kalau tidak `CATEGORY_BUCKET[item.category]`; kalau tidak ada `DEFAULT_BUCKET`. `getBucketMeta(id)` mengembalikan `BUCKETS[0]` sebagai cadangan.

- [ ] **Step 3: Verifikasi lulus**

Ulangi pemeriksaan Step 1 → `{ jumlah: 10, adaBucketOf: 'function' }`. Sekalian: `c.bucketOf({ category: 'rdadan' })` → `'needs'`, `c.bucketOf({ category: 'hiburan', bucket: 'auto' })` → `'wants'`, `c.bucketOf({ category: 'hiburan', bucket: 'needs' })` → `'needs'`. `npm run build` hijau.

- [ ] **Step 4: Commit**

```bash
git add components/categories.js
git commit --no-gpg-sign -m "Keuangan: tambah kategori Rumah & Cicilan, Hiburan & Liburan, Tabungan & Utang + peta keranjang"
```

---

### Task 2: Logika anggaran murni (tanpa React)

**Files:**
- Create: `components/budget.js`

**Interfaces:**
- Consumes: `BUCKETS`, `DEFAULT_BUCKET`, `bucketOf` (Task 1)
- Produces:
  - `DEFAULT_RATIOS = { needs: 50, wants: 30, savings: 20 }`
  - `DEFAULT_POS = { needs: [{id:'n1',label}…], wants: [{id:'w1'…}], savings: [{id:'s1'…}] }`
  - `getBudget(data) -> { month, income, ratios, pos }`
  - `allocate(income, ratios) -> { needs, wants, savings }`
  - `summarize(expenses, budget) -> { alokasi, realisasi, selisih, status, jumlah, total: {alokasi, realisasi, selisih} }`
  - `ratiosValid(ratios) -> boolean`
  - `statusOf(realisasi, alokasi) -> 'aman'|'hati-hati'|'lebih'`

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

```js
(async () => { try { const m = await import('/components/budget.js'); return { ada: true, keys: Object.keys(m) }; }
  catch (e) { return { ada: false, pesan: String(e).slice(0, 60) }; } })()
```
Hasil sekarang: `{ ada: false, pesan: '...Failed to fetch dynamically imported module...' }` (berkas belum ada).

- [ ] **Step 2: Implementasi `components/budget.js`**

- `getBudget(data)`: `income = Number(data?.budget?.income ?? data?.budget?.total) || 0`; `ratios = { ...DEFAULT_RATIOS, ...(data?.budget?.ratios || {}) }`; `pos = { ...DEFAULT_POS, ...(data?.budget?.pos || {}) }`; `month = data?.budget?.month || 'Oktober 2026'`.
- `allocate(income, ratios)`: `income` tidak valid atau ≤ 0 → semua `0`; selain itu `Math.round(income * pct / 100)` per keranjang.
- `summarize(expenses, budget)`: `alokasi = allocate(budget.income, budget.ratios)`; telusuri `expenses` → `realisasi[bucketOf(item)] += Number(item.amount) || 0` dan `jumlah[bucket] += 1`; `selisih[b] = alokasi[b] - realisasi[b]`; `status[b] = statusOf(realisasi[b], alokasi[b])`; `total` = jumlah ketiganya.
- `ratiosValid(ratios)`: ketiga nilai `Number.isInteger`, `0 ≤ n ≤ 100`, dan `needs + wants + savings === 100`.
- `statusOf(realisasi, alokasi)`: `alokasi <= 0` → `realisasi > 0 ? 'lebih' : 'aman'`; `realisasi > alokasi` → `'lebih'`; `realisasi > alokasi * 0.8` → `'hati-hati'`; selain itu `'aman'`.
- `DEFAULT_POS` = daftar pos Kakang: Kebutuhan (Cicilan rumah/sewa; Belanja bahan makanan & beras; Tagihan utilitas (listrik/air/internet); Transportasi (BBM/angkutan umum); Sekolah anak; Asuransi kesehatan), Keinginan (Makan di luar/hangout; Hobi & hiburan; Langganan streaming; Liburan/travelling), Tabungan & Utang (Dana darurat (target 3–6× pengeluaran bulanan); Tabungan; Investasi; Pembayaran cicilan/utang) — id `n1…n6`, `w1…w4`, `s1…s4`.

- [ ] **Step 3: Verifikasi lulus**

```js
(async () => { const m = await import('/components/budget.js');
  const b = { month: 'Oktober 2026', income: 8000000, ratios: m.DEFAULT_RATIOS, pos: m.DEFAULT_POS };
  const alok = m.allocate(b.income, b.ratios);
  const g0 = m.allocate(0, b.ratios);
  const lama = m.getBudget({ budget: { total: 8000000, month: 'September 2026' } });
  const luar = m.getBudget({});
  return { alok, g0, incomeLama: lama.income, bulanLama: lama.month, rasioCadangan: lama.ratios,
           incomeKosong: luar.income, valid: [m.ratiosValid({needs:50,wants:30,savings:20}),
           m.ratiosValid({needs:50,wants:30,savings:30}), m.ratiosValid({needs:-10,wants:60,savings:50})],
           status: [m.statusOf(0, 0), m.statusOf(100, 0), m.statusOf(3600000, 4000000), m.statusOf(4100000, 4000000)] }; })()
```
Harus: `alok {needs:4000000,wants:2400000,savings:1600000}`, `g0` semua 0 (bukan `NaN`), `incomeLama 8000000`, `bulanLama 'September 2026'`, `incomeKosong 0`, `valid [true,false,false]`, `status ['aman','lebih','hati-hati','lebih']`. `npm run build` hijau.

- [ ] **Step 4: Commit**

```bash
git add components/budget.js
git commit --no-gpg-sign -m "Anggaran: helper murni getBudget/allocate/summarize + nilai cadangan snapshot lama"
```

---

### Task 3: Data contoh baru (11 item, donat 9 irisan) + token warna

**Files:**
- Modify: `App.jsx` (`mockData.budget` ~192, `.expenses` ~93, `.categories` ~210)
- Modify: `App.css` (blok token gelap ~42 dan terang ~119)

**Interfaces:**
- Consumes: `CATEGORY_BUCKET` (Task 1)
- Produces: `mockData.budget = { month, income: 8000000, ratios, pos }`; 11 pengeluaran (tanpa field `bucket`); donat 9 entri memakai `--chart1..--chart9`

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

`node -e "console.log(1150000+900000+600000+450000+250000+150000+100000, 450000+350000+1000000, 900000)"` → `3600000 1800000 900000`
`node -e "console.log(3600000+1800000+900000)"` → `6300000` (harus sama dengan angka lama → invariant D21).
Keadaan sekarang di DOM: legenda donat masih **6 baris** (harusnya nanti 9).

- [ ] **Step 2: Ganti data contoh**

`budget` → `{ month: 'Oktober 2026', income: 8000000, ratios: {needs:50,wants:30,savings:20}, pos: {…sama seperti DEFAULT_POS Task 2…} }`.
`expenses` → 11 item (7 Kebutuhan, 3 Keinginan, 1 Tabungan) sesuai tabel spec §5; tanggal `2026-10-14` → `2026-10-04`; **tanpa** field `bucket` (dihitung dari kategori).
`categories` → 9 entri berurutan token: Belanja Bulanan 900.000 (`--chart1`), Pendidikan 600.000 (`--chart2`), Utilitas 450.000 (`--chart3`), Ibadah & Sosial 250.000 (`--chart4`), Transportasi 150.000 (`--chart5`), Kesehatan 100.000 (`--chart6`), Rumah & Cicilan 1.150.000 (`--chart7`), Hiburan & Liburan 1.800.000 (`--chart8`), Tabungan & Investasi 900.000 (`--chart9`).
`App.css`: blok gelap tambah `--chart7: 236 72 153; --chart8: 45 212 191; --chart9: 163 230 53;`; blok terang tambah `--chart7: 219 39 119; --chart8: 13 148 136; --chart9: 101 163 13;`.

- [ ] **Step 3: Verifikasi lulus**

Sentuh mtime `App.jsx` + `App.css`, hapus snapshot lama, reload. Di DOM: hero `79%`, `Sisa dari Rp 8 jt` = `Rp 1,7 jt`, donat total `Rp 6,3 jt` dengan **9** legenda, tren Okt `6.300.000`. `summarize` lewat impor modul → realisasi `{needs:3600000, wants:1800000, savings:900000}`. Konsol error 0.

- [ ] **Step 4: Commit**

```bash
git add App.jsx App.css
git commit --no-gpg-sign -m "Anggaran: data contoh 50/30/20 (11 item, donat 9 irisan) + token chart7-9"
```

---

### Task 4: Dashboard & header Keuangan membaca satu sumber

**Files:**
- Modify: `components/Dashboard.jsx` (baris 42, 62, 88, 135, 138, 180)
- Modify: `App.jsx:1055`

**Interfaces:**
- Consumes: `getBudget(data)` (Task 2)
- Produces: tidak ada API baru; angka Dashboard tidak berubah

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

Suntik snapshot lama lalu reload:
```js
localStorage.setItem('bayt-mustaqbal-data-v1', JSON.stringify({ budget: { total: 8000000, month: 'September 2026' } })); location.reload();
```
Sesudah reload, lihat kartu hero Dashboard: sekarang persentase/sisa jadi **salah atau `NaN`/`Rp 0`** (ini kegagalannya), karena `data.budget.total` tidak ada.

- [ ] **Step 2: Alihkan rujukan ke helper**

Di `components/Dashboard.jsx`: tambah `const budget = getBudget(data);` di dalam komponen; ganti 6 rujukan `data.budget.total` → `budget.income` dan 1 rujukan `data.budget.month` → `budget.month`. Sama di `App.jsx:1055` (`formatCurrencyShort(data.budget.total)` → `formatCurrencyShort(getBudget(data).income)`).

- [ ] **Step 3: Verifikasi lulus**

Ulangi pemeriksaan Step 1 (snapshot lama disuntik) → hero **benar**: `79%`, `Rp 1,7 jt`, `dari Rp 8 jt`, label bulan `September 2026`, konsol error 0. Lalu hapus snapshot, reload → angka kembali seperti semula. `npm run build` hijau.

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard.jsx App.jsx
git commit --no-gpg-sign -m "Anggaran: Dashboard & header Keuangan baca budget lewat getBudget (aman snapshot lama)"
```

---

### Task 5: Halaman Anggaran (isi statis) + sub-tab

**Files:**
- Create: `components/Budgeting.jsx`
- Modify: `App.jsx` (state `financeMode`; cabang render section `expenses` ~1042-1080)

**Interfaces:**
- Consumes: `getBudget`, `allocate`, `summarize` (Task 2), `BUCKETS` (Task 1), `StatCard`/`ProgressBar`/`Badge` dari `./ui`, `formatCurrency`, `formatCurrencyShort`
- Produces: `Budgeting({ data, formatCurrency, formatCurrencyShort, onOpenEditor })`; state `financeMode` (`'pengeluaran' | 'anggaran'`); angka bertanda `data-budget="alokasi-needs|realisasi-needs|selisih-needs|…"` untuk pemeriksaan DOM

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

```js
(() => ({ subtab: document.querySelectorAll('[aria-label="Mode tampilan keuangan"] button').length,
          angka: document.querySelector('[data-budget="realisasi-needs"]')?.textContent || null }))()
```
Hasil sekarang: `{ subtab: 0, angka: null }`. Yang diharapkan nanti: `{ subtab: 2, angka: 'Rp 3.600.000' }`.

- [ ] **Step 2: Implementasi**

`components/Budgeting.jsx`: `useMemo` → `budget = getBudget(data)`, `alokasi = allocate(budget.income, budget.ratios)`, `ringkas = summarize(data.expenses, budget)`.
Kartu pemasukan: gaji + bulan + baris rasio + tombol **Ubah** (memanggil `onOpenEditor()`); gaji 0 → `Rp 0` + ajakan "Isi pemasukan bulan ini".
3 kartu keranjang (urut `BUCKETS`): judul + `Badge` status (**ikon + teks**: Aman/Hati-hati/Lebih), `formatCurrency(realisasi[ b ])` + `dari` + `formatCurrency(alokasi[b])`, `ProgressBar` dengan nilai `Math.min(100, persen)`, selisih (tanda "sisa"/"lebih"), jumlah pengeluaran, daftar pos, tombol **Tambah pos**.
Ringkasan: 3 `StatCard` — Alokasi (= gaji), Realisasi (`total.realisasi`), Sisa (`total.selisih`).
`App.jsx`: `const [financeMode, setFinanceMode] = useState('pengeluaran')`; di section `expenses` render segmented control 2 tombol (pola sub-tab Agenda: `role="group" aria-label="Mode tampilan keuangan"`, `grid grid-cols-2 … sm:inline-flex`, `min-h-[44px]`, `aria-pressed`); `SectionHeader` bersyarat (mode anggaran: ikon `pieChart`, judul "Anggaran", subjudul `Gaji ${formatCurrencyShort(income)} · ${budget.month}`, aksi "Ubah"); chip kategori & grid `ExpenseCard` hanya di mode pengeluaran; `Budgeting` hanya di mode anggaran.

- [ ] **Step 3: Verifikasi lulus**

Pemeriksaan Step 1 → `{ subtab: 2, angka: 'Rp 3.600.000' }`. Mode pengeluaran tetap utuh (chip + kartu). Mode anggaran: alokasi `4.000.000 / 2.400.000 / 1.600.000`, realisasi `3.600.000 / 1.800.000 / 900.000`, sisa `400.000 / 600.000 / 700.000`, badge **Hati-hati** (Kebutuhan 90%) + **Aman** (75%, 56%).
Uji **Lebih**: naikkan sementara satu `amount` sehingga realisasi > alokasi → badge "Lebih" muncul, `ProgressBar` tetap penuh tanpa meluber (cek `scrollWidth - clientWidth === 0`), lalu kembalikan.
Lebar 320/390/768/1280: overflow 0, target sentuh ≥44px, sub-tab bisa di-Tab + Enter. Konsol error 0. `npm run build` hijau.

- [ ] **Step 4: Commit**

```bash
git add components/Budgeting.jsx App.jsx
git commit --no-gpg-sign -m "Anggaran: halaman Anggaran (pemasukan, 3 keranjang, alokasi vs realisasi) + sub-tab di Keuangan"
```

---

### Task 6: Editor gaji & rasio (validasi jumlah 100)

**Files:**
- Modify: `components/Budgeting.jsx` (editor inline)
- Modify: `App.jsx` (handler `handleSaveBudget`)

**Interfaces:**
- Consumes: `ratiosValid`, `DEFAULT_RATIOS` (Task 2)
- Produces: `onSaveBudget({ income, ratios })`; teks galat editor `Jumlah rasio harus 100% (sekarang N%)`

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

Di DOM: buka mode Anggaran → klik **Ubah** → set nilai input lewat `data-budget-input`, lalu klik `data-budget-action="save"`:
```js
(() => { const set = (k, v) => { const el = document.querySelector('[data-budget-input="' + k + '"]');
    if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('needs', '50'); set('wants', '30'); set('savings', '30');
  document.querySelector('[data-budget-action="save"]')?.click();
  return document.querySelector('[data-budget="alokasi-wants"]')?.textContent || 'editor belum ada'; })()
```
Sekarang: `alokasi-wants` berubah jadi `Rp 2.400.000`… artinya **nilai tidak sah tersimpan tanpa keluhan** (ini kegagalannya).

- [ ] **Step 2: Implementasi**

`Budgeting.jsx`: editor inline yang dibuka tombol **Ubah** — input gaji (`type="number" min="0"`), 3 input persen (`type="number" min="0" max="100"`), tombol **Pakai 50/30/20** (isi `DEFAULT_RATIOS`), tombol Simpan/Batal; Simpan hanya bila `ratiosValid(ratios) === true` **dan** gaji ≥ 0, kalau tidak tampilkan pesan galat di dalam kartu dan jangan panggil `onSaveBudget`.
Beri tanda agar bisa diperiksa otomatis: input `data-budget-input="income|needs|wants|savings"`, tombol `data-budget-action="save"`, `data-budget-action="reset"`, dan kotak galat `data-budget="error"`.
`App.jsx`: `handleSaveBudget(patch)` → `setData(prev => ({ ...prev, budget: { ...prev.budget, ...patch } }))` + toast "Anggaran diperbarui" (pakai pola toast yang ada).

- [ ] **Step 3: Verifikasi lulus**

`50/30/30` → **ditolak**, pesan "Jumlah rasio harus 100% (sekarang 110%)" muncul, alokasi tidak berubah. `60/20/20` → tersimpan: alokasi `4.800.000 / 1.600.000 / 1.600.000`, sisa total ikut berubah, hero tetap `79%` (gaji tidak berubah). **Reload → nilai bertahan.** Tombol preset → kembali `50/30/20`. Gaji `0` → alokasi `Rp 0`, tidak ada `NaN`. Konsol error 0.

- [ ] **Step 4: Commit**

```bash
git add components/Budgeting.jsx App.jsx
git commit --no-gpg-sign -m "Anggaran: editor gaji & rasio dengan validasi jumlah 100% + preset 50/30/20"
```

---

### Task 7: Pos keranjang (tambah/ubah/hapus/pindah keranjang)

**Files:**
- Modify: `App.jsx` (`SHEET_CONFIG` ~239-260, `openAdd`, handler simpan/hapus pos)
- Modify: `components/Budgeting.jsx` (daftar pos + tombol)

**Interfaces:**
- Consumes: `BUCKETS` (Task 1), `DEFAULT_POS` (Task 2), `FormSheet`/`ItemActions` (sudah ada)
- Produces: `SHEET_CONFIG.budgetPos`; `openAdd(section, nilaiAwal)` (param opsional — pemanggil lama tidak berubah); `savePos(pos, originalBucket)`; `deletePos(bucket, id)`; callback `onAddPos(bucket)`, `onEditPos(bucket, pos)`, `onDeletePos(bucket, pos)`

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

Di DOM mode Anggaran: cari tombol pos yang berfungsi →
```js
(() => ({ tombolTambah: document.querySelectorAll('[data-pos="add"]').length,
          tombolHapus: document.querySelectorAll('[data-pos="delete"]').length }))()
```
Hasil sekarang: `{ tombolTambah: 0, tombolHapus: 0 }` (daftar pos hanya teks).

- [ ] **Step 2: Implementasi**

`App.jsx`: `SHEET_CONFIG.budgetPos = { title: 'Tambah Pos Anggaran', icon: 'target', fields: [{ key:'label', label:'Nama pos', type:'text', required:true }, { key:'bucket', label:'Keranjang', type:'select', required:true, defaultValue:'needs', options: BUCKETS.map(b => ({ value: b.id, label: b.label })) }] }`.
`openAdd(section, nilaiAwal)`: param kedua opsional, dipakai untuk mengisi nilai awal (`openAdd('budgetPos', { bucket })` dari kartu keranjang; `openAdd('expenses')` tetap jalan tanpa perubahan).
`savePos({ id, bucket, label }, originalBucket)`: bila `id` ada → buang dari `originalBucket`; sisipkan ke `bucket` (id baru = `Date.now()` bila baru). `deletePos(bucket, id)` mengikuti pola `deleteItem` yang ada.
`Budgeting.jsx`: tiap pos jadi baris dengan tombol `data-pos="edit"` (pensil → `openEdit('budgetPos', { id, bucket, label })`) dan `data-pos="delete"` (tempat sampah, ≥44px), plus tombol `data-pos="add"` di bawah daftar yang meneruskan `bucket` kartu.

- [ ] **Step 3: Verifikasi lulus**

Pemeriksaan Step 1 → `tombolTambah: 3` (satu per kartu keranjang) dan `tombolHapus: 14` (6 + 4 + 4 pos bawaan). Tambah pos di Keinginan → muncul di kartu Keinginan; ubah teksnya; pindah ke Tabungan → hilang dari Keinginan; hapus → hilang. **Reload → semua bertahan.** Konsol error 0.

- [ ] **Step 4: Commit**

```bash
git add App.jsx components/Budgeting.jsx
git commit --no-gpg-sign -m "Anggaran: pos keranjang bisa ditambah, diubah, dipindah, dan dihapus (lewat FormSheet)"
```

---

### Task 8: Field keranjang di form pengeluaran

**Files:**
- Modify: `App.jsx` (`SHEET_CONFIG.expenses` ~251-260)

**Interfaces:**
- Consumes: `BUCKETS` (Task 1), `bucketOf` (Task 1)
- Produces: field `bucket` di form pengeluaran dengan default `'auto'`; `bucketOf` mengabaikan `'auto'`

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

Di DOM mode Pengeluaran: **buka form "Tambah Pengeluaran" dulu**, lalu periksa pilihan keranjang —
```js
(() => ({ adaOtomatis: !!document.querySelector('option[value="auto"]'),
          opsi: [...document.querySelectorAll('option')].map(o => o.textContent).filter(t => /Otomatis|Kebutuhan|Keinginan|Tabungan/.test(t)) }))()
```
Hasil sekarang: `{ adaOtomatis: false, opsi: [] }`.

- [ ] **Step 2: Implementasi**

Tambah ke `SHEET_CONFIG.expenses.fields`, setelah `category`:
`{ key: 'bucket', label: 'Keranjang', type: 'select', defaultValue: 'auto', options: [{ value:'auto', label:'Otomatis (ikut kategori)' }, { value:'needs', label:'Kebutuhan' }, { value:'wants', label:'Keinginan' }, { value:'savings', label:'Tabungan & Utang' }] }`.
Pastikan `FormSheet` mengisi `defaultValue` untuk pengeluaran lama yang belum punya `bucket` (kalau tidak, tampilkan `'auto'` sebagai nilai bila field kosong).

- [ ] **Step 3: Verifikasi lulus**

Pemeriksaan Step 1 → `{ adaOtomatis: true, opsi: ['Otomatis (ikut kategori)', 'Kebutuhan', 'Keinginan', 'Tabungan & Utang'] }`. Tambah pengeluaran kategori `hiburan` dengan keranjang **Otomatis** → realisasi Keinginan bertambah; ubah jadi **Kebutuhan** → pindah ke Kebutuhan (Keinginan berkurang); ubah kembali ke Otomatis → kembali ke Keinginan. Edit pengeluaran lama (tanpa `bucket`) → pilihan menunjukkan **Otomatis**. Konsol error 0.

- [ ] **Step 4: Commit**

```bash
git add App.jsx
git commit --no-gpg-sign -m "Anggaran: form pengeluaran dapat field keranjang (default otomatis dari kategori)"
```

---

### Task 9: Sinkronisasi dokumen + verifikasi menyeluruh

**Files:**
- Modify: `AGENT.md`, `DESIGN-SYSTEM.md`, `README.md`, `docs/04-KEPUTUSAN-TERKUNCI.md`, `docs/superpowers/specs/2026-10-14-anggaran-budgeting-design.md`

**Interfaces:**
- Consumes: hasil Task 1-8
- Produces: dokumen yang cocok dengan kode

- [ ] **Step 1: Jalankan pemeriksaan yang harus GAGAL sekarang**

`Select-String -Path AGENT.md,DESIGN-SYSTEM.md,README.md -Pattern "budget\.js|Budgeting\.jsx|chart7"` → belum ada hasil (dokumen belum menyebut modul baru).

- [ ] **Step 2: Perbarui dokumen**

`AGENT.md`: pohon berkas (+`components/budget.js`, +`components/Budgeting.jsx`), baris section Keuangan (sub-tab Pengeluaran/Anggaran), catatan jumlah item Timeline bila terpengaruh (11 pengeluaran), Roadmap, Last updated.
`DESIGN-SYSTEM.md`: §5/§6 (sub-tab Keuangan, kartu keranjang, aturan status Aman/Hati-hati/Lebih), §7 token warna (`--chart7/8/9`).
`README.md`: daftar fitur (modul Anggaran + cara pakai singkat).
`docs/04-KEPUTUSAN-TERKUNCI.md`: baris D26 menyatakan **sudah dikerjakan**.
Spec §10: tandai A2/A3 sebagai keputusan final (bukan lagi poin terbuka).

- [ ] **Step 3: Verifikasi menyeluruh**

1. `npm run build` hijau.
2. Invariant D21 & aritmatika: hero = donat = tren Okt = `10.650.000`; alokasi `4.000.000/2.400.000/1.600.000`; realisasi `7.950.000/1.800.000/900.000`; sisa `-3.950.000/600.000/700.000`.
3. Snapshot lama disuntik → tetap aman (fallback `income ← total`).
4. Pos & field keranjang bertahan setelah reload.
5. 320/390/768/1280 → overflow 0, target sentuh ≥44px, sub-tab & sheet bisa di-Tab/Enter/Esc, konsol error 0.
6. Mode Pengeluaran tidak kehilangan fungsi apa pun dibanding sebelum pekerjaan ini.

- [ ] **Step 4: Commit**

```bash
git add AGENT.md DESIGN-SYSTEM.md README.md docs
git commit --no-gpg-sign -m "Dokumen: sinkronkan modul Anggaran (AGENT, DESIGN-SYSTEM, README, D26) + verifikasi menyeluruh"
```
