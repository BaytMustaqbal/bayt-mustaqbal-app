# 03 — ROADMAP

## Prinsip Penjadwalan

> **Jangan bangun modul yang belum dipakai 2 minggu.**
>
> Semua fase setelah Fase 1 hanya dibangun setelah Kakang + Istri benar-benar
> memakai modul sebelumnya selama minimal 2 minggu. Alasannya: requirement yang
> muncul setelah pemakaian jauh lebih tajam daripada requirement yang diasumsikan
> sekarang. Membangun semuanya di awal = membangun requirement yang salah.

---

## Peta Fase

| Fase | Isi | Modul | Output |
|---|---|---|---|
| **0** | Pondasi | Setup, Auth, Shell, Kontrak API | Login berhasil, sidebar kosong, semua aset termuat |
| **1** | MVP Keuangan | Kategori, Transaksi, Tagihan, Recurring, Dashboard, Email | **Dipakai setiap hari** |
| **1.5** | Real Usage | Pakai 2 minggu, catat request | Daftar perbaikan terstruktur |
| **2** | Absensi & Kalender | Absensi, Kalender, Notifikasi agenda | Kalender keluarga jalan |
| **3** | Service & Review | Service Aset, Service Log, Review & Grafik | "Motor due kapan?" jawabannya ada |
| **4** | Polish | Catatan, Budget, Snapshot, Ekspor, Impor CSV | Arsip &(lhs) analisis jangka panjang |

---

## FASE 0 — Pondasi

**Target:** 1 sesi kerja

| # | Task | Deliverable |
|---|---|---|
| 0.1 | Buat spreadsheet `FAMILY_OS_DATA` | Spreadsheet kosong |
| 0.2 | `Config.gs` — ID sheet via `PropertiesService` (bukan hardcode) | Konfigurasi terpusat |
| 0.3 | `appsscript.json` — manifest: timezone Asia/Jakarta, webapp access | Manifest benar |
| 0.4 | `Setup.gs` — fungsi `provision_()`: buat 15 sheet + header + seed users/settings/categories/accounts | **Sekali klik → semua sheet siap** |
| 0.5 | `Sheet.gs` — `readTable_`, `appendRow_`, `updateRow_`, `findById_`, `nextRow_` (berbasis header) | 5 fungsi inti |
| 0.6 | `Api.gs` — dispatcher `api(action, payload)` + pembungkus `{ok, data, error}` | Kontrak API jadi |
| 0.7 | `Guard.gs` — `requireUser_()`, `requireRole_()`, `Validator` | Auth & role |
| 0.8 | `Audit.gs` — `write_()` ke `audit_log` | Jejak perubahan |
| 0.9 | `index.html` — shell, sidebar 7 menu (menyebut "segera"), router hash | App terbuka |
| 0.10 | `styles.css` — token warna, layout, komponen dasar | Tampilan rapi |
| 0.11 | `api.js` — wrapper `google.script.run` dengan promise + toast error | Komunikasi client |
| 0.12 | Deploy versi 1 (`/dev`) + login test | **AKSES BERHASIL** |

> **Deploy 2 versi wajib:** `exec` (Execute as Me, akses Myself) untuk dev,
> `prod` (Anyone with Google account) untuk Kakang & Istri.
> Dev dulu, test dulu, baru naik ke prod. Jangan deploy langsung ke prod.

---

## FASE 1 — MVP Keuangan

**Target:** 2–3 sesi kerja
**Ini fase yang menentukan apakah aplikasi ini dipakai atau ditinggalkan.**

| # | Task | Deliverable |
|---|---|---|
| 1.1 | `Categories.gs` — CRUD kategori + reorder + budget | Master kategori jalan |
| 1.2 | `Transactions.gs` — `list/create/update/delete` + validasi + pagination | Transaksi masuk & aman |
| 1.3 | `transactions.html` — Input Cepat (grid kartu) + Bottom Sheet | **Input < 10 detik** |
| 1.4 | `transactions.html` — Daftar + filter + paginasi | Bisa cari & koreksi |
| 1.5 | Konflik edit (`rev`) | Tidak ada data tertimpa diam-diam |
| 1.6 | `Recurring.gs` — CRUD template + `generate_()` | Tagihan rutin otomatis |
| 1.7 | `Bills.gs` — CRUD + `pay()` (1 transaksi = 1 operasi) + `generate_()` | Bayar tagihan aman |
| 1.8 | `bills.html` — Daftar grouped per status + cicilan card | Semua tagihan kelihatan |
| 1.9 | `Accounts.gs` — CRUD rekening + rumus saldo (D11) | Saldo per rekening hidup |
| 1.10 | `Dashboard.gs` — 10 kartu ringkasan | 1 layar jawaban |
| 1.11 | `dash.html` — Render dashboard + status warna | Dashboard hidup |
| 1.12 | `NotifWA.gs` — `sendWA_()`, `dailyDigestWA_()`, `billReminderCheck_()` | Kirim WA via Fonnte |
| 1.13 | `Settings.gs` + `settings.html` — budget, notifikasi WA (token, target grup), pengguna | Bisa diatur |
| 1.14 | Trigger `DailyDigestWA` (harian jam `settings.jam_notifikasi`) + `BillReminderCheck` (setiap jam) | Notifikasi jalan |
| 1.15 | Deploy ke `prod`, masukkan email Istri ke `users` | **ISTRI BISA LOGIN** |

### Kriteria Selesai Fase 1

- [ ] Kakang & Istri bisa login dari URL yang sama
- [ ] Istri bisa input pengeluaran biasa tanpa bantuan, dalam 10 detik
- [ ] Istri **tidak bisa** mengubah kategori atau settings (dapat pesan jelas)
- [ ] Semua transaksi masuk ke sheet dengan `dibuat_oleh` yang benar
- [ ] Bayar tagihan → transaksi terbentuk + tagihan jadi lunas, dalam 1 klik
- [ ] Recurring men-generate tagihan bulan berjalan dengan benar (termasuk iuran sampah)
- [ ] **WA Digest pagi diterima di grup, dan tidak terkirim kalau tidak ada isi**
- [ ] **Reminder iuran sampah jam 08:00 (contoh) terkirim ke WA grup**
- [ ] 2 orang input bersamaan tanpa data saling menimpa
- [ ] Audit log mencatat semua create/update/delete
- [ ] Error tidak pernah hilang diam-diam (selalu ada toast + log)

---

## FASE 1.5 — Real Usage (2 Minggu)

**Bukan coding. Ini fase terpenting.**

Yang harus Kakang catat (bukan di aplikasi, di notes biasa):

| Yang dicatat | Contoh |
|---|---|
| Permintaan yang muncul | "Tolong ada filter per metode bayar" |
| Yang diklik 0 kali | "Menu Catatan tidak pernah dibuka" |
| Yang merepotkan | "Setiap kali buka harus login ulang" |
| Salah input yang terjadi | "Istri salah pilih kategori, susah dikoreksi" |
| Yang muncul di kepala | "Perlu tahu total cicilan selesai kapan" |

Dari daftar itu, pilih maksimal **5 perbaikan** untuk Fase 1.6.
Jangan lebih dari 5. Kalau lebih, itu artinya requirement-nya belum matang.

---

## FASE 2 — Absensi & Kalender

| # | Task | Deliverable |
|---|---|---|
| 2.1 | `Attendance.gs` — upsert per (tanggal, nama) + quota | Data absensi aman |
| 2.2 | `attendance.html` — Kalender bulanan grid + chip status | Absensi visual |
| 2.3 | Isi cepat (Hadir/Izin/Cuti/Sakit) + alasan wajib | Input cepat |
| 2.4 | Progress bar sisa jatah | Tahu sisa cuti |
| 2.5 | `Calendar.gs` — CRUD + toggle selesai | Data agenda |
| 2.6 | `calendar.html` — Month view + agenda view | 2 tampilan |
| 2.7 | `biaya_rencana` → tombol "Catat sebagai Pengeluaran" | Rencana jadi transaksi |
| 2.8 | Integrasi agenda ke Dashboard & daily digest | Semua nyambung |
| 2.9 | Tandai hari libur nasional dari `settings.hari_libur` | Kalender terasa hidup |

**Kriteria selesai:** absensi terisi 1 bulan penuh tanpa complain; agenda keluarga
terlihat dari Dashboard.

---

## FASE 3 — Service & Review

| # | Task | Deliverable |
|---|---|---|
| 3.1 | `ServiceAsset.gs` — CRUD aset + interval | Master motor/rumah |
| 3.2 | `Service.gs` — CRUD log + `due_()` + auto buat transaksi | Riwayat lengkap |
| 3.3 | `service.html` — Kartu aset + detail + riwayat | "Kapan servis?" |
| 3.4 | `service.html` — Grafik biaya per tahun | Biaya kumulatif terlihat |
| 3.5 | `Review.gs` — monthly, compare, by_category, trend | Angka dijelaskan |
| 3.6 | `review.html` — Tabel budget vs realisasi + 3 grafik | Analisa |
| 3.7 | `charts.js` + vendor lokal Chart.js | Grafik jalan |
| 3.8 | Prediksi akhir bulan | Peringatan dini |

**Kriteria selesai:** semua aset motor & rumah terdaftar, riwayat masuk, due
terlihat di Dashboard.

---

## FASE 4 — Polish

| # | Task | Deliverable |
|---|---|---|
| 4.1 | `Notes.gs` + `notes.html` | Wadah catatan |
| 4.2 | Budget global + prediksi harian | Kontrol belanja |
| 4.3 | `MonthlySnapshot.gs` — trigger tanggal 1 | Arsip historis |
| 4.4 | Ekspor CSV per bulan (per transaksi/tagihan/absensi) | Data keluar dari app |
| 4.5 | Impor CSV transaksi + absensi | Migrasi data lama |
| 4.6 | Batch delete per periode | Bersih-bersih |
| 4.7 | PWA basics (manifest, theme-color, ikon) | Tampilan app di home screen |
| 4.8 | Dokumentasi `README.md` di project GAS | Kakang bisa rawat sendiri |

---

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Trigger mati** setelah 30 hari tanpa eksekusi | Notifikasi tidak dikirim | Trigger wajib via `ScriptApp.newTrigger()`. Tombol "Cek Trigger" di Settings. |
| **Fonnte down / token expired / quota habis** | WA tidak terkirim | Settings menampilkan status terakhir kirim. Fallback manual: cek app langsung. |
| **Spreadsheet exceeds quota** | App berhenti | Monitoring baris di Settings. Archive otomatis saat > 50.000 baris. |
| **Ketidakdisiplin input** (tanggal ngawur, kategori salah) | Laporan kacau | Validasi ketat server + dropdown paksa, bukan free text. |
| **Istri tidak nyaman** | Ditinggalkan | Fase 1.5 validasi. Kalau gagal, perbaiki UI **sebelum** tambah modul. |
| **Google Sheet cocok atau tidak?** | Salah fondasi | Untuk 2 pengguna: **cukup**. Kalau > 10 aktif, evaluasi pindah DB. |
| **Kakang lupa cara rawat** | App mati | Semua keputusan di dokumen ini, bukan hanya di kepala. |

---

## Estimasi Realistis

| Fase | Sesi kerja | Catatan |
|---|---|---|
| 0 | 1 | Kerangka, tidak banyak keputusan |
| 1 | 2–3 | Paling banyak keputusan karena ini inti |
| 1.5 | — | 2 minggu pemakaian nyata |
| 1.6 | 0.5 | Perbaikan dari Fase 1.5, maksimal 5 item |
| 2 | 1–2 | Absensi + kalender relatif straightforward |
| 3 | 1–2 | Service + grafik |
| 4 | 1 | Polish, bisa dipecah |

> Angka ini **estimasi kasar**, bukan janji. Yang penting urutan dan kriteria selesai,
> bukan jumlah jam. Kalau ada fase yang butuh 2x dari perkiraan, itu informasi
> berguna — bukan kegagalan.