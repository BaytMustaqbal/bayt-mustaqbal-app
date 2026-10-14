# Spec — Modul Anggaran (Budgeting 50/30/20)

**Tanggal:** 14 Oktober 2026
**Status:** menunggu review Kakang (belum ada kode yang diubah)
**Terkait:** `docs/04-KEPUTUSAN-TERKUNCI.md` D21 (satu sumber angka), D25 (tetap PWA), `DESIGN-SYSTEM.md` §6 (5 section, tanpa router)

---

## 1. Tujuan

Kakang memasukkan **gaji** setiap gajian, lalu app otomatis membaginya **50% Kebutuhan · 30% Keinginan · 20% Tabungan & Utang**, dan menampilkan **realisasi** tiap keranjang dari pengeluaran yang sudah dicatat — supaya kelihatan keranjang mana yang bocor.

**Bukan tujuan (sekarang):** riwayat bulanan, geser saldo antar keranjang, nominal per pos, notifikasi khusus anggaran, donut per keranjang.

## 2. Keputusan yang sudah diambil

| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | Letak modul | **Sub-tab di section Keuangan**: `Pengeluaran` & `Anggaran` (section tetap 5) |
| 2 | Kedalaman | **Alokasi + realisasi** (realisasi dihitung otomatis dari pengeluaran nyata) |
| 3 | Penghubung ke keranjang | **Field `bucket` per pengeluaran** (default dari kategori, bisa dikoreksi) **+ 3 kategori baru** |
| 4 | Rasio | **Bisa disunting**, default 50/30/20, jumlah wajib 100 |
| 5 | Pos dalam keranjang | **Daftar saran yang bisa disesuaikan** (tambah/ubah/hapus/pindah keranjang) |
| 6 | Pendekatan data | **Satu bulan aktif, angka turunan** (tidak ada agregat tersimpan) |
| 7 | Cicilan rumah | **Kategori tersendiri** `Rumah & Cicilan` (donat jadi 9 irisan) |
| 8 | Editor gaji & rasio | **Editor kecil di halaman Anggaran** (FormSheet tidak disentuh) |
| 9 | Arti "ditandai" pada pos | **Label saja** — tanpa centang "selesai", tanpa nominal (dikonfirmasi 14 Okt 2026) |

### Alasan keputusan yang paling menentukan

- **Satu bulan, angka turunan (baris 6).** Cara app bekerja sekarang sudah menganggap seluruh data = satu periode (`budget.month`, hero, donat, tren tidak memfilter tanggal). Menyimpan agregat alokasi/realisasi berisiko jadi angka kedua yang bisa berbeda dari sumbernya — persis masalah yang diperbaiki D21. Riwayat bulanan ditunda sampai sumber data pindah ke Worker + D1 (di sana bulan memang baris tabel).
- **Field `bucket` + koreksi manual (baris 3).** Kategori `ibadah` (zakat/infak) tidak ada di rumus 50/30/20 dan "cicilan" muncul di dua keranjang (rumah = Kebutuhan, utang lain = Tabungan). Tanpa koreksi per transaksi, dua kasus itu tidak bisa dijawab.
- **Editor terpisah untuk rasio (baris 8).** `FormSheet` dipakai 4 section dan tidak punya validasi silang antar-field; menambahkannya menyentuh komponen bersama. Editor kecil di halaman Anggaran = risiko nol ke section lain.

## 3. Model data

### Sekarang

```js
budget: { total: 8000000, month: 'Oktober 2026' },
```

### Menjadi

```js
budget: {
  month: 'Oktober 2026',
  income: 8000000,                              // gaji yang diinput tiap gajian
  ratios: { needs: 50, wants: 30, savings: 20 }, // jumlah wajib 100
  pos: {
    needs:   [{ id: 'n1', label: 'Cicilan rumah/sewa' }, ...],
    wants:   [{ id: 'w1', label: 'Makan di luar/hangout' }, ...],
    savings: [{ id: 's1', label: 'Dana darurat (target 3–6× pengeluaran bulanan)' }, ...],
  },
},
```

Item pengeluaran mendapat field opsional `bucket`:

```js
{ id: 1, category: 'rumah', description: 'Sewa & cicilan rumah', amount: 1150000, date: '2026-10-14', bucket: 'needs' }
```

`bucket` bernilai `'needs' | 'wants' | 'savings'`, atau `'auto'`/tidak ada. Rumus pembacaan:

```js
bucketOf(item) = (item.bucket && item.bucket !== 'auto') ? item.bucket : CATEGORY_BUCKET[item.category] || 'needs'
```

Konsekuensi penting: **data lama tidak bikin rusak.** Snapshot `localStorage` lama tidak punya `bucket`/`income`/`ratios`/`pos`; semuanya punya nilai cadangan, jadi app tetap jalan (lihat §7).

### Peta kategori → keranjang (`CATEGORY_BUCKET`)

| Keranjang | Kategori keuangan |
|---|---|
| **Kebutuhan** (50%) | `belanja`, `utilitas`, `pendidikan`, `transportasi`, `kesehatan`, `ibadah`, **`rumah`** (baru) |
| **Keinginan** (30%) | **`hiburan`** (baru) |
| **Tabungan & Utang** (20%) | **`tabungan`** (baru) |

Kategori baru di `FINANCE_CATEGORIES`:

| id | label | ikon |
|---|---|---|
| `rumah` | Rumah & Cicilan | `home` |
| `hiburan` | Hiburan & Liburan | `sparkles` |
| `tabungan` | Tabungan & Utang | `trendingUp` |

## 4. Aturan hitung

```
alokasi[b]  = income × ratios[b] / 100
realisasi[b] = Σ amount pengeluaran dengan bucketOf(item) === b
selisih[b]  = alokasi[b] − realisasi[b]        // minus = "lebih"
total       = income (Σ alokasi) dan Σ realisasi
```

Status tiap keranjang (selalu **ikon + teks**, bukan warna saja):

| Status | Syarat | Nada |
|---|---|---|
| **Aman** | realisasi ≤ 80% alokasi | tenang |
| **Hati-hati** | 80% < realisasi ≤ 100% | peringatan |
| **Lebih** | realisasi > 100% alokasi | bahaya |

**Semua angka dihitung saat render** (`useMemo`), tidak disimpan. Tidak ada nilai agregat di `mockData` untuk alokasi/realisasi.

## 5. Data contoh baru

Gaji **Rp 8.000.000** (angka lama `budget.total` dipertahankan → hero "realisasi anggaran 79% · sisa Rp 1,7 jt" **tidak berubah**).
Alokasi: Kebutuhan **4.000.000** · Keinginan **2.400.000** · Tabungan & Utang **1.600.000**.

| Keranjang | Item (kategori) | Jumlah |
|---|---|---|
| **Kebutuhan** — 3.600.000 / 4.000.000 = **90%** (status *Hati-hati*) | Sewa & cicilan rumah (`rumah`) | 1.150.000 |
| | Belanja bahan makanan (`belanja`) | 900.000 |
| | SPP sekolah (`pendidikan`) | 600.000 |
| | Tagihan listrik & air (`utilitas`) | 450.000 |
| | Zakat & infak (`ibadah`) | 250.000 |
| | Bensin & tol (`transportasi`) | 150.000 |
| | Obat & vitamin keluarga (`kesehatan`) | 100.000 |
| **Keinginan** — 1.800.000 / 2.400.000 = **75%** (*Aman*) | Makan di luar keluarga (`hiburan`) | 450.000 |
| | Langganan streaming & hobi (`hiburan`) | 350.000 |
| | Liburan akhir pekan (`hiburan`) | 1.000.000 |
| **Tabungan & Utang** — 900.000 / 1.600.000 = **56%** (*Aman*) | Setoran tabungan & dana darurat (`tabungan`) | 900.000 |

Total **Rp 6.300.000** — tetap sama, jadi invariant D21 utuh: **hero = donat = tren Okt = 6,3 jt**.

Donat `categories` jadi **9 irisan** (jumlah tetap 6.300.000), butuh token baru `--chart7`, `--chart8`, `--chart9` di tema gelap **dan** terang:

| Kategori | Nilai | Token |
|---|---|---|
| Belanja Bulanan | 900.000 | `--chart1` |
| Pendidikan | 600.000 | `--chart2` |
| Utilitas | 450.000 | `--chart3` |
| Ibadah & Sosial | 250.000 | `--chart4` |
| Transportasi | 150.000 | `--chart5` |
| Kesehatan | 100.000 | `--chart6` |
| Rumah & Cicilan | 1.150.000 | **`--chart7`** |
| Hiburan & Liburan | 1.800.000 | **`--chart8`** |
| Tabungan & Investasi | 900.000 | **`--chart9`** |

Pos bawaan (label saja, mengikuti daftar Kakang):

- **Kebutuhan:** Cicilan rumah/sewa · Belanja bahan makanan & beras · Tagihan utilitas (listrik/air/internet) · Transportasi (BBM/angkutan umum) · Sekolah anak · Asuransi kesehatan
- **Keinginan:** Makan di luar/hangout · Hobi & hiburan · Langganan streaming · Liburan/travelling
- **Tabungan & Utang:** Dana darurat (target 3–6× pengeluaran bulanan) · Tabungan · Investasi · Pembayaran cicilan/utang

## 6. Tampilan (UI)

Section `Keuangan` mendapat state `financeMode: 'pengeluaran' | 'anggaran'` (default `'pengeluaran'`).

```
Keuangan
[ Pengeluaran ] [ Anggaran ]     ← tombol 44px, aria-pressed, pola sama dengan sub-tab Agenda
```

`SectionHeader` mengikuti mode (pola yang sudah dipakai halaman Agenda):

| Mode | Header |
|---|---|
| Pengeluaran | seperti sekarang: ikon `wallet`, judul = label kategori, subjudul total + anggaran, aksi "Tambah" |
| Anggaran | ikon `pieChart`, judul "Anggaran", subjudul `Gaji Rp 8 jt · Oktober 2026`, aksi "Ubah" (buka editor gaji) |

Isi mode Anggaran (`components/Budgeting.jsx`), atas → bawah:

1. **Kartu Pemasukan** — gaji (`formatCurrency`), bulan, baris rasio; tombol **Ubah** membuka **editor inline**: input gaji + 3 persen, tombol **Pakai 50/30/20**, validasi "jumlah harus 100" (pesan galat di dalam kartu), Simpan/Batal.
2. **Tiga Kartu Keranjang** — judul + badge status, `Rp 3.600.000 dari Rp 4.000.000`, `ProgressBar` (komponen yang ada), sisa/lebih, jumlah pengeluaran, daftar pos (pensil → FormSheet, tempat sampah → konfirmasi seperti `ItemActions` yang ada), tombol **Tambah pos**.
3. **Ringkasan** — 3 `StatCard`: Alokasi (= gaji) · Realisasi · Sisa.

Form pengeluaran (`SHEET_CONFIG.expenses`) mendapat 1 field baru:

```js
{ key: 'bucket', label: 'Keranjang', type: 'select', defaultValue: 'auto',
  options: [ {value:'auto',label:'Otomatis (ikut kategori)'}, {value:'needs',label:'Kebutuhan'},
             {value:'wants',label:'Keinginan'}, {value:'savings',label:'Tabungan & Utang'} ] }
```

Default `'auto'` → jalur pencatatan sehari-hari tetap seperti sekarang (tidak ada ketukan tambahan), koreksi manual tetap mungkin.

**Terapkan kalau salah** — aksesibilitas: sub-tab bisa di-Tab + Enter, editor & FormSheet bisa Esc, semua target sentuh ≥44px, status tidak pernah disampaikan lewat warna saja, dan tidak ada overflow horizontal 320–1280px.

## 7. Daya tahan terhadap data lama

`loadInitialData()` memakai **merge dangkal** (`{ ...mockData, ...parsed }`), jadi snapshot lama bisa menggantikan seluruh objek `budget`. Nilai cadangan wajib ada:

| Kasus | Perilaku yang diharapkan |
|---|---|
| `budget.income` tidak ada (snapshot lama masih `total`) | `income = budget.income ?? budget.total ?? 0` |
| `budget.ratios` tidak ada | pakai default 50/30/20 |
| `budget.pos` tidak ada | pakai daftar pos bawaan |
| `expenses[].bucket` tidak ada | dihitung dari kategori |
| `data.categories` lama (6 irisan) | donat tetap seperti snapshot (bukan crash); "Muat ulang data contoh" mengembalikannya ke 9 irisan |

Semua nilai cadangan dikumpulkan di satu helper `getBudget(data)` (`components/budget.js`) supaya **satu sumber** — `Dashboard.jsx` (6 rujukan `data.budget.total` + 1 `data.budget.month`) dan `App.jsx` (1 rujukan `data.budget.total`) dialihkan ke helper itu, jadi lapisan tampilan tidak lagi membaca `budget.*` langsung.

## 8. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `components/categories.js` | +3 kategori keuangan; + `BUCKETS`, `CATEGORY_BUCKET`, `bucketOf` |
| `components/budget.js` | **baru** — `DEFAULT_RATIOS`, `DEFAULT_POS`, `getBudget`, perhitungan alokasi/realisasi/status (murni, tanpa React) |
| `components/Budgeting.jsx` | **baru** — halaman Anggaran |
| `App.jsx` | state `financeMode`; mockData `budget`/`categories`/`expenses` baru; field `bucket` di `SHEET_CONFIG.expenses`; `openAdd(section, nilaiAwal)`; cabang mode Keuangan; handler simpan gaji & pos |
| `components/Dashboard.jsx` | 7 rujukan `data.budget.*` (6× `total`, 1× `month`) → `getBudget(data)` (nol perubahan tampilan) |
| `App.css` | +token `--chart7/8/9` (gelap & terang) |
| `docs/04-KEPUTUSAN-TERKUNCI.md`, `AGENT.md`, `DESIGN-SYSTEM.md`, `README.md` | sinkronisasi (D26) |

## 9. Cara membuktikan (proyek belum punya test runner → verifikasi DOM + build)

1. `npm run build` hijau; konsol **0 error**.
2. Aritmatika: alokasi **4.000.000 / 2.400.000 / 1.600.000**, realisasi **3.600.000 / 1.800.000 / 900.000**, sisa **400.000 / 600.000 / 700.000**, total **6.300.000** = hero = donat = tren Okt (D21).
3. Editor rasio: jumlah ≠ 100 → **ditolak** dengan pesan; preset 50/30/20 bekerja; simpan → alokasi + hero berubah konsisten; **reload tetap** (localStorage).
4. Badge: default sudah menampilkan **Hati-hati** (Kebutuhan 90%) dan **Aman** (Keinginan 75%, Tabungan 56%); status **Lebih** diuji dengan mengubah angka sementara, lalu dikembalikan.
5. Snapshot lama disuntik (`{"budget":{"total":8000000,"month":"September 2026"}}`) → app tidak crash, fallback terpakai, `income` = 8 jt.
6. Form pengeluaran: default *Otomatis*; koreksi manual menang atas peta kategori; tersimpan setelah reload.
7. Pos: tambah · ubah · hapus · pindah keranjang; tetap setelah reload.
8. Lebar **320 / 390 / 768 / 1280**: 0 overflow horizontal, target sentuh ≥44px, sub-tab & sheet bisa di-Tab/Enter/Esc.

## 10. Poin terbuka

| # | Poin | Default kalau tidak dijawab |
|---|---|---|
| A2 | Zakat & infak ditaruh di **Kebutuhan** | Kebutuhan (kewajiban); bisa dikoreksi per transaksi lewat field keranjang |
| A3 | Setoran tabungan dicatat sebagai **pengeluaran** (padahal secara akuntansi itu transfer) | Dipertahankan, supaya realisasi 20% bisa diukur |
| A4 | Kalau Kakang mengubah rasio (mis. 60/20/20), data contoh tetap 50/30/20 | Boleh berbeda — ringkasan keranjang langsung menyesuaikan; data contoh tidak ikut berubah |
