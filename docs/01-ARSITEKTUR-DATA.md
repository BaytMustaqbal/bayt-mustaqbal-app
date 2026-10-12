# 01 — ARSITEKTUR DATA

> **STATUS — 12 Okt 2026:** Dokumen ini bagian dari rencana **FAMILY OS versi Google Sheets + Apps Script** (11 Okt 2026). **Bagian stack sudah tidak berlaku** — acuan teknis sekarang **Cloudflare Pages (React + Vite di root repo) + Cloudflare Worker + D1**; lihat `README.md` dan `AGENT.md`. **Keputusan produknya tetap berlaku** (D1 admin/user, D5 satu tabel agenda, D6 `recurring` ≠ `bills`, D9 edit 24 jam, D11 rekening aktif, D13 estimasi tagihan, D15 WA via Fonnte, D16 iuran sampah). Disimpan sebagai riwayat: jangan dipakai sebagai acuan teknis sebelum dipetakan ulang ke D1.
>
> **Khusus berkas ini:** istilah "sheet/tab" → "tabel D1"; skema 15 tab dipetakan ke migrasi D1. Yang tetap dipakai: kolom `rev` (deteksi konflik) dan soft delete (`void`) — data keuangan tidak boleh hilang fisik.

Sumber kebenaran: satu Google Spreadsheet bernama `FAMILY_OS_DATA`.
Semua modul membaca & menulis ke sini. Tidak ada database lain.

---

## 0. Konvensi Umum (WAJIB dipatuhi semua sheet)

| Konvensi | Aturan | Alasan |
|---|---|---|
| **Header** | Baris 1 = nama kolom, `freezeRow(1)`, bold, background abu-abu | Sheet masih dibuka manual sesekali; header harus jelas |
| **ID** | String `UUID` (`Utilities.getUuid()`), bukan angka urut | Aman dipakai URL/query tanpa encode |
| **Tanggal** | Format teks `YYYY-MM-DD`. **JANGAN** pakai Date object | Sheet menyimpan Date sebagai nomor serial → timezone kacau |
| **Waktu** | Teks `YYYY-MM-DD HH:mm:ss` (ISO-like, sortable) | Sortabel sebagai string, tidak ada ambiguity timezone |
| **Angka uang** | Angka polos (bukan Rp 1.500,00). Format ditampilkan di UI saja | Sheet harus bisa dijumlahkan langsung |
| **Boolean** | `YA` / `TIDAK` | Lebih terbaca daripada TRUE/FALSE saat dibuka manual |
| **Soft delete** | Tiap tabel punya kolom `void` (`YA`/`TIDAK`). Hapus = set `void=YA` | Data keuangan tidak boleh hilang fisik (untuk audit & laporan) |
| **Revisi** | Tiap tabel punya `rev` (angka, mulai 1) | Deteksi konflik saat 2 orang edit baris sama |
| **Jejak audit per baris** | `dibuat_oleh`, `dibuat_pada`, `diubah_oleh`, `diubah_pada` (isi email + waktu) | Tahu siapa input apa |
| **Kolom tambahan** |-headed `extra_*` boleh ditambah, mis. `extra_tempo_kerja` | Semua kode query WAJIB pakai `getRangeByHeader()` bukan indeks kolom tetap |

### Aturan terakhir yang paling penting

> Kode **dilarang** menulis dengan `sheet.getRange(2, 3, ...)` — indeks kolom.
> Selalu pakai `readTable_()` / `appendRow_()` yang berbasis **nama header**.
> Skilled alasan: begitu ada kolom baru, semua query lama otomatis ikut benar,
> tidak ada bug "data masuk ke kolom yang salah" yang diam-diam merusak data.

---

## 1. `users` — Akun & Hak Akses

| Kolom | Tipe | Keterangan |
|---|---|---|
| `user_id` | text | UUID |
| `email` | text | **Primary key informal.** Email Google, lowercase |
| `nama` | text | Nama tampilan |
| `role` | enum | `admin` \| `user` |
| `aktif` | YA/TIDAK | Nonaktif = tidak bisa login |
| `dibuat_pada` | datetime | |

**Hak akses:**

| Aksi | admin | user |
|---|---|---|
| Lihat semua modul | ✅ | ✅ |
| Tambah transaksi | ✅ | ✅ |
| Tambah catatan/acara/kehadiran | ✅ | ✅ |
| Edit/hapus transaksi **miliknya sendiri** (< 24 jam) | ✅ | ✅ |
| Edit/hapus transaksi **orang lain / lebih lama** | ✅ | ❌ |
| Ubah master kategori | ✅ | ❌ |
| Ubah settings (budget, jam notifikasi) | ✅ | ❌ |
| Tambah user baru | ✅ | ❌ |
| Kelola data master (aset, tagihan template) | ✅ | ❌ |
| Lihat audit log | ✅ | ❌ |
| Ekspor / arsip bulanan | ✅ | ❌ |

> Catatan: "edit milik sendiri < 24 jam" dipilih karena Istri sering salah input
> 5 menit setelahnya. Setelah 24 jam, data dianggap final dan hanya admin yang bisa.

---

## 2. `settings` — Konfigurasi Global (key-value)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `k` | text | Kunci (primary) |
| `v` | text | Nilai |
| `tipe` | enum | `text` \| `number` \| `bool` \| `date` |
| `keterangan` | text | Untuk dokumentasi di sheet |

**Kunci wajib (seed):**

| `k` | Contoh | Fungsi |
|---|---|---|
| `nama_keluarga` | `Keluarga Triana` | Judul header aplikasi |
| `mulai_data` | `2026-10-01` | Batas bawah filter tanggal |
| `bulan_angsuran_gaji` | `25` | Tanggal gaji berikutnya |
| `default_scope` | `keluarga` | Scope default saat input transaksi |
| `mata_uang` | `IDR` | Untuk tampilan |
| `hari_libur` | `2026-01-01,2026-02-17,...` | **Daftar hari libur nasional, CSV `YYYY-MM-DD`.** Dipakai kalender + absensi |
| `cuti_tahunan` | `12` | Default jatah cuti (per override di `attendance_quota`) |
| `fonnte_token` | `xxx` | **API Token Fonnte** (dari dashboard fonnte.com) |
| `fonnte_target` | `62812xxxxxxx@g.us` | **Target WA Group ID** (format: nomor@g.us) |
| `fonnte_device` | `default` | Device ID Fonnte (opsional, default `default`) |
| `notifikasi_channel` | `WA` | Channel notifikasi: `WA` \| `EMAIL` \| `BOTH` — **default `WA`** |

---

## 3. `categories` — Master Kategori (Income & Expense)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `category_id` | text | UUID |
| `nama` | text | Contoh: `Gaji`, `Makan`, `Bensin`, `Servis Motor` |
| `tipe` | enum | `income` \| `expense` |
| `scope` | enum | `pribadi` \| `keluarga` \| `usaha` |
| `parent_id` | text | Sub-kategori. Contoh: `Transportasi` > `Bensin` |
| `warna` | text | Hex untuk grafik, mis. `#4CAF50` |
| `ikon` | text | Nama ikon (dari set lokal, bukan CDN) |
| `budget_bulanan` | number | **Limit belanja per bulan.** `0` = tanpa budget |
| `aktif` | YA/TIDAK | Kategori tidak aktif disembunyikan, tapi data lama tetap utuh |
| `urutan` | number | Urutan tampil |

**Kategori awal (seed) — sudah lengkap dengan budget default supaya bisa langsung dipakai:**

- *Income:* `Gaji` · `Lembur` · `Bonus` · `Side Job` · `Usaha` · `Refund` · `Lain-lain`
- *Expense — Keluarga:* `Makan & Belanja` `Transportasi` `Tagihan` `Pendidikan` `Kesehatan` `Perlengkapan Rumah` `Liburan` `Cicilan` `Zakat/Infak`
- *Expense — Pribadi:* `Grooming` `Hobi` `Seragam/Kerja` `Kopi`
- *Expense — Usaha:* `Bahan Baku` `Alat` `Transport` `Iklan` `Operasional`

---

## 4. `accounts` — Sumber Dana (WAJIB, aktif sejak Fase 1)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `account_id` | text | UUID |
| `nama` | text | `BCA Tabungan`, `Cash`, `GoPay` |
| `tipe` | enum | `tunai` \| `rekening` \| `ewallet` \| `kartu_kredit` |
| `saldo_awal` | number | Saldo di `settings.mulai_data` |
| `saldo_terakhir` | number | Cache, dihitung tiap baca Dashboard (bukan sumber kebenaran) |
| `kartu_kredit` | YA/TIDAK | Jika YA, transaksi = kewajiban (masuk `bills` sebagai `tipe=kartu_kredit`), bukan pengeluaran riil |
| `urutan` | number | Urutan tampil di Dashboard |
| `aktif` | YA/TIDAK | |

**Seed:**

| Nama | Tipe | Saldo Awal |
|---|---|---|
| `Cash` | `tunai` | 0 |
| `BCA` | `rekening` | 0 |
| `GoPay` | `ewallet` | 0 |

**Kenapa wajib sejak Fase 1:** kalau saldo rekening baru ditambahkan belakangan,
seluruh transaksi lama jadi tidak punya sumber dana → laporan saldo per rekening
tidak bisa dihitung retroaktif. Migration data/history itu mahal. Tambahkan dari awal.

**Rumus saldo (dihitung on-the-fly, bukan disimpan):**

```
saldo(account) = saldo_awal
              + SUM(transaksi tipe=income  pada account)
              - SUM(transaksi tipe=expense pada account)

kartu_kredit  = saldo_awal
              - SUM(transaksi tipe=expense pada account)
              + SUM(terpDibayar)   -- dibayar = bill.status lunas
```

> Kolom `saldo_terakhir` sengaja hanya cache untuk ditampilkan. Kalau nilainya
> pernah berbeda dengan hasil rumus di atas, **rumus yang menang**.

---

## 5. `transactions` — Inti Keuangan

Satu tabel untuk income & expense. Alasan: jumlah baris kecil, dan filter
income/expense cukup dari kolom `tipe` + `kategori.tipe`. Dua tabel terpisah
akan menduplikasi validasi dan membuat laporan lebih rumit.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `txn_id` | text | UUID |
| `tanggal` | date | `YYYY-MM-DD` |
| `periode` | text | `YYYY-MM` (derived) — dipercepat untuk agregasi |
| `tipe` | enum | `income` \| `expense` |
| `kategori_id` | text | FK → `categories` |
| `kategori_nama` | text | Disalin saat transaksi (denormalisasi) — supaya laporan lama tidak berubah saat kategori di-rename |
| `jumlah` | number | Selalu positif. Tanda ditentukan `tipe` |
| `account_id` | text | FK → `accounts` (boleh kosong = tidak relevan) |
| `scope` | enum | `pribadi` \| `keluarga` \| `usaha` |
| `metode` | enum | `tunai` \| `transfer` \| `debit` \| `kredit` \| `ewallet` |
| `keterangan` | text | Catatan bebas |
| `tags` | text | Tag dipisah koma: `urgent,rutin` |
| `recurring_id` | text | FK → `recurring` (kosong = manual) |
| `bill_id` | text | FK → `bills` (otomatis terisi saat tagihan dibayar) |
| `void` | YA/TIDAK | Soft delete |
| `dibuat_oleh` / `dibuat_pada` | text/datetime | |
| `diubah_oleh` / `diubah_pada` | text/datetime | |
| `rev` | number | |

**Aturan main:**

- Tanggal transaksi **tidak boleh** lebih dari `settings.mulai_data`, dan **tidak boleh** di masa depan lebih dari 1 hari (koreksi timezone).
- `jumlah` minimal 1.000, maksimal 9.999.999.999 (dijaga).
- Menghapus transaksi yang `bill_id`-nya terisi tidak langsung mengubah status tagihan.
  Yang berubah: transaksi pembayar hilang → tagihan kembali ke `belum` pada proses
  rekap harian (bukan real-time, agar tidak ada write bolak-balik).

---

## 6. `recurring` — Template Transaksi Rutin

Template, bukan transaksi nyata. Dipakai generator `generateRecurring_()` untuk
menghasilkan baris `transactions` di awal bulan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `rec_id` | text | UUID |
| `nama` | text | `Gaji`, `Listrik`, `Internet IndiHome`, `Cicilan Motor` |
| `tipe` | enum | `income` \| `expense` |
| `kategori_id` | text | FK |
| `jumlah` | number | Nominal tetap. Untuk variabel (listrik) isi 0 → prompted saat generate |
| `frekuensi` | enum | `harian` \| `mingguan` \| `bulanan` \| `tahunan` |
| `interval` | number |_DEFAULT 1. `2` = tiap 2 bulan |
| `tanggal_mulai` | date | |
| `tanggal_akhir` | date | Kosong = selamanya |
| `hari_tanggal` | number | Tanggal dalam bulan (untuk bulanan), mis. `25` |
| `scope` | enum | |
| `account_id` | text | |
| `auto_post` | YA/TIDAK | `YA` = langsung jadi transaksi tanpa konfirmasi |
| `kategori_variabel` | YA/TIDAK | Variance nominal (listrik/internet bisa naik) |
| `aktif` | YA/TIDAK | |
| `void`, `dibuat_*`, `diubah_*`, `rev` | | Standar |

**Contoh seed:**

| Nama | Tipe | Frekuensi | Hari | Jumlah |
|---|---|---|---|---|
| Gaji | income | bulanan | 25 | (isi nanti) |
| Listrik PLN | expense | bulanan | 10 | 0 (variabel) |
| Internet IndiHome | expense | bulanan | 15 | 350.000 |
| Asuransi kendaraan | expense | bulanan | 5 | 650.000 |
| Simpanan | expense | bulanan | 2 | 500.000 |

---

## 7. `bills` — Tagihan & Cicilan

**Perbedaan penting dari `recurring`:**

| | `recurring` | `bills` |
|---|---|---|
| Sifat | Template aturan | **Instance nyata** per periode |
| Jumlah baris | Sedikit (5-10) | Banyak (puluhan per tahun) |
| Punya status bayar | ❌ | ✅ (`belum` / `lunas` / `terlambat`) |
| Dihitung dari | Master | `generateRecurring_()` + input manual |

| Kolom | Tipe | Keterangan |
|---|---|---|
| `bill_id` | text | UUID |
| `nama` | text | |
| `tipe` | enum | `rutin` \| `cicilan` \| `sekali` \| `kartu_kredit` \| `iuran_sampah` |
| `jumlah` | number | |
| `jatuh_tempo` | date | |
| `periode` | text | `YYYY-MM` |
| `cicilan_ke` | number | Untuk `tipe=cicilan` |
| `total_cicilan` | number | |
| `sisa_cicilan` | number | Derived = total - cicilan_ke + 1 |
| `rec_id` | text | FK → `recurring` (asal tagihan) |
| `status` | enum | `belum` \| `lunas` |
| `estimasi` | YA/TIDAK | `YA` = nominal hasil tebakan, wajib diedit sebelum dibayar |
| `lunas_pada` | date | |
| `txn_id` | text | Transaksi yang membayar |
| `prioritas` | enum | `tinggi` \| `normal` \| `rendah` |
| `kategori_id` | text | |
| `catatan` | text | |
| `remind_at` | datetime | **Waktu pengingat spesifik** `YYYY-MM-DD HH:mm` — untuk iuran sampah & tagihan butuh jam pasti |
| `remind_channel` | enum | `WA` \| `EMAIL` \| `BOTH` — default `WA` (Fonnte) |
| `remind_sent` | YA/TIDAK | Sudah terkirim pengingat ini |
| `void`, `dibuat_*`, `diubah_*`, `rev` | | Standar |

> **Status `terlambat` tidak disimpan** — dihitung saat baca:
> `status = belum` DAN `jatuh_tempo < hari_ini` → tampil sebagai **TERLAMBAT** (merah).
> Menyimpannya terpisah bisa langsung salah begitu tanggal bergeser.

> **Tagihan variabel** (listrik, internet, pulsa): `recurring.kategori_variabel = YA`
> → `generate_()` membuat bill dengan `estimasi = YA` dan nominal = `recurring.jumlah`
> sebagai tebakan. Dialog "Bayar" mewajibkan user confirmar nominal sebelum disimpan.
> Tidak ada angka yang diam-diam dipakai untuk laporan — selama belum dibayar,
> `estimasi` berarti "belum pasti".

---

## 8. `attendance` — Absensi Kerja

| Kolom | Tipe | Keterangan |
|---|---|---|
| `att_id` | text | UUID |
| `tanggal` | date | |
| `periode` | text | `YYYY-MM` |
| `nama` | text | Nama karyawan (default: user yang login) |
| `status` | enum | `hadir` \| `izin` \| `cuti` \| `sakit` \| `lembur` \| `WFH` \| `cuti_mannual` |
| `alasan` | text | Wajib jika `izin`/`cuti`/`sakit` |
| `keterangan` | text | Catatan tambahan (mis. nomor surat) |
| `dari_jam` / `sampai_jam` | text | Untuk `lembur` / `WFH` |
| `catatan` | text | |
| `dibuat_oleh` / `dibuat_pada` | text/datetime | |
| `void`, `rev` | | |

**Aturan:**
- Satu baris per `(tanggal, nama)` — unique. Upsert, bukan insert.
- Absensi **boleh diisi ke depan** untuk rencana cuti. Penandanya bukan status baru,
  tapi kolom `terjadwal` (`YA`/`TIDAK`). Jadi cuti yang sudah direncanakan bisa
  diubah jadi `hadir` kalau ternyata tidak diambil.

### `attendance_quota` — Jatah Tahunan

| Kolom | Tipe |
|---|---|
| `tahun` | number |
| `nama` | text |
| `jatah_cuti` | number |
| `jatah_izin` | number |
| `catatan` | text |

Pemakaian (terpakai_cuti, terpakai_izin) **dihitung on-the-fly** dari `attendance`,
tidak disimpan — supaya tidak pernah meleset.

---

## 9. `calendar_events` — Kalender (Keluarga, Liburan, Rencana)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `event_id` | text | UUID |
| `judul` | text | |
| `kategori` | enum | `keluarga` \| `liburan` \| `rencana` \| `kerja` \| `spiritual` \| `ultah` |
| `tanggal_mulai` | date | |
| `tanggal_selesai` | date | Boleh sama dengan mulai (event 1 hari) |
| `jam_mulai` / `jam_selesai` | text | `HH:mm`, opsional |
| `lokasi` | text | |
| `deskripsi` | text | |
| `biaya_rencana` | number | Estimasi biaya → masuk ke rencana pengeluaran |
| `all_day` | YA/TIDAK | |
| `reminder_hari` | number | Default dari settings; `0` = hari yang sama |
| `reminder_email` | YA/TIDAK | |
| `selesai` | YA/TIDAK | Untuk daftar rencana / checklist |
| `rec_id` | text | FK → `recurring` (mis. rutinitas mingguan mengaji) |
| `prioritas` | enum | `tinggi` \| `normal` \| `rendah` |
| `void`, `dibuat_*`, `diubah_*`, `rev` | | |

> Semua jenis acara masuk ke satu tab `calendar_events`, dibedakan lewat kolom
> `kategori`. Jangan buat tab terpisah "Liburan" dan "Rencana" — makin banyak
> tab, makin besar peluang data masuk ke tab yang salah.

---

## 10. `service_asset` — Master Aset (Motor & Rumah)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `asset_id` | text | UUID |
| `nama` | text | `Motor Beat`, `AC Ruang Tidur`, `Pompa Air` |
| `grup` | enum | `motor` \| `rumah` \| `elektronik` \| `perabot` \| `lainnya` |
| `merek` / `tipe` / `tahun` | text | `Honda`, `AC 1 PK`, `2019` |
| `no_seri` | text | Plat / nomor seri / Inv. number |
| `lokasi` | text | |
| `interval_hari` | number | Jarak antar servis |
| `interval_km` | number | Untuk motor |
| `keterangan` | text | |
| `aktif` | YA/TIDAK | |
| `void`, `dibuat_*`, `diubah_*`, `rev` | | |

---

## 11. `service_log` — Riwayat Perawatan

| Kolom | Tipe | Keterangan |
|---|---|---|
| `svc_id` | text | UUID |
| `asset_id` | text | FK |
| `jenis` | enum | `servis` \| `ganti` \| `perbaikan` \| `rutin` \| `claim_asuransi` |
| `tanggal` | date | |
| `kilometer` | number | Untuk motor |
| `biaya` | number | |
| `vendor` | text | Bengkel / tukang |
| `no_nota` | text | |
| `parts` | text | `keterangan` — CSV: `oli 1L, filter udara` |
| `txn_id` | text | Transaksi pengeluaran (bisa auto-buat) |
| `catatan` | text | |
| `selesai` | YA/TIDAK | |
| `void`, `dibuat_*`, `diubah_*`, `rev` | | |

**Jadwal berikutnya** = `tanggal + interval_hari` atau `kilometer + interval_km`.
Dihitung on-the-fly, **tidak disimpan** — supaya interval yang diubah otomatis berlaku.

---

## 12. `notes` — Catatan Bebas

| Kolom | Tipe |
|---|---|
| `note_id` | text (UUID) |
| `judul` | text |
| `isi` | text (boleh panjang, simpan sebagai string di 1 sel) |
| `kategori` | enum `ide` \| `resep` \| `referensi` \| `lainnya` |
| `pin` | YA/TIDAK |
| `void`, `dibuat_*`, `diubah_*`, `rev` | |

---

## 13. `audit_log` — Jejak Perubahan

| Kolom | Tipe | Keterangan |
|---|---|---|
| `log_id` | text | UUID |
| `waktu` | datetime | |
| `email` | text | Siapa |
| `role` | enum | |
| `aksi` | enum | `create` \| `update` \| `delete` \| `login` \| `generate` \| `export` \| `setting` |
| `entity` | text | `transactions` \| `bills` \| dst |
| `entity_id` | text | |
| `ringkas` | text | Contoh: `transaksi #a1b2 "Belanja bulanan" Rp 450.000` |
| `sebelum` | text | JSON (hanya untuk `update`) |
| `sesudah` | text | JSON (hanya untuk `update`) |

> Sheet ini **tidak pernah** dihapus dan tidak punya kolom `void`. Tapi tetap dibatasi
> 20.000 baris (rotasi ke `audit_log_archive`).

---

## 14. `notification_log` — Riwayat Kirim Notifikasi

| Kolom | Tipe |
|---|---|
| `notif_id` | text |
| `waktu` | datetime |
| `tipe` | enum `tagihan` \| `absensi` \| `service` \| `agenda` \| `ringkasan_bulanan` |
| `periode` | text |
| `penerima` | text |
| `status` | enum `terkirim` \| `gagal` |
| `pesan` | text |
| `error` | text |

---

## 15. `monthly_snapshot` — Rekap Bulanan (Arsip)

| Kolom | Tipe |
|---|---|
| `periode` | text `YYYY-MM` (unique) |
| `saldo_awal` | number |
| `total_income` | number |
| `total_expense` | number |
| `saldo_akhir` | number |
| `total_hutang` | number |
| `total_aset` | number |
| `tinggal_cuti_akhir` | number |
| `jumlah_transaksi` | number |
| `dibuat_pada` | datetime |
| `dibuat_oleh` | text |

> Tutup tiap tanggal 1. Menyimpan angka historis supaya laporan bulan lalu
> tidak berubah ketika data lama diedit.

---

## Relasi (ERD Ringkas)

```
users ──┐
        │
settings (key-value, standalone)

categories ──< transactions >──┬── recurring (rec_id)
     │                        ├── bills (bill_id)
     │                        └── service_log (txn_id)
     └── parent_id (self-referencing, sub-kategori)

recurring ──< bills        recurring ──< calendar_events
accounts ──< transactions

service_asset ──< service_log

attendance ──(tanggal, nama)── attendance_quota (tahun, nama)
calendar_events ── kategori filter (bukan tab terpisah)

audit_log          : menulis ke semua entity
notification_log   : dari trigger harian
monthly_snapshot   : dari cron tanggal 1
```

---

## Aturan Integrasi (yang sering dilanggar)

1. **Bayar tagihan = 2 operasi dalam 1 transaksi.**
   `bills.status = lunas` DAN `buka transaksi` (dengan `bill_id` terisi).
   Kalau salah satu gagal → dua-duanya dibatalkan (`rollback` manual dengan lock).

2. **Transaksi dari `recurring` tidak boleh diedit manual.**
   Edit = buat `recurring` baru (efektif bulan depan). Ini mencegah
   "kenapa gaji bulan lalu berubah?".

3. **Cicilan lunas otomatis.**
   `service_log` / `bills` dengan `tipe=cicilan` dan `cicilan_ke = total_cicilan`
   → status `lunas`, tanggal berikutnya tidak digenerate.

4. **Soft delete tidak boleh untuk `audit_log` & `notification_log`.**

5. **Semua operasi tulis dibungkus:**
   ```js
   const lock = LockService.getScriptLock();
   lock.waitLock(30000);
   try { /* tulis */ } finally { lock.releaseLock(); }
   ```
   Dan setiap halaman baca tidak pernah memanggil `getDataRange()` penuh untuk
   tabel besar — selalu `getRange(startRow, 1, numRows, numCols)` dengan batas.

---

## Batas & Peringatan Teknis (jujur)

| Batas Google Sheets | Nilai | Implikasi untuk FAMILY OS |
|---|---|---|
| penulis bersamaan | ~50 penulis | 2 orang **aman** |
| sel per spreadsheet | 10 juta | cukup untuk ± 20 tahun data keluarga |
| waktu eksekusi trigger | 6 menit | daily digest aman |
| kuota email keluar | 100/day | daily digest aman |
| `onEdit` trigger | 30 detik | tidak dipakai; audit dilakukan di dalam `api()` |

Kekhawatiran: Sheet **tidak cocok** jadi database umum. Tapi untuk 2 pengguna
dan data transaksi keluarga — **sangat cocok**. Yang membuat Sheet cepat lambat
adalah `getDataRange()` penuh dan scan tanpa filter. Karena itu semua query
WAJIB pakai filter tanggal/range di level server.