# 02 — SPESIFIKASI MODUL

> **STATUS — 12 Okt 2026:** Dokumen ini bagian dari rencana **FAMILY OS versi Google Sheets + Apps Script** (11 Okt 2026). **Bagian stack sudah tidak berlaku** — acuan teknis sekarang **Cloudflare Pages (React + Vite di root repo) + Cloudflare Worker + D1**; lihat `README.md` dan `AGENT.md`. **Keputusan produknya tetap berlaku** (D1 admin/user, D5 satu tabel agenda, D6 `recurring` ≠ `bills`, D9 edit 24 jam, D11 rekening aktif, D13 estimasi tagihan, D15 WA via Fonnte, D16 iuran sampah). Disimpan sebagai riwayat: jangan dipakai sebagai acuan teknis sebelum dipetakan ulang ke D1.
>
> **Khusus berkas ini:** kontrak `google.script.run` → digantikan HTTP API dari Worker. Yang **tetap dipakai**: bentuk balasan `{ ok, data, error }`, kode error standar (`UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `SERVER`), pola nama aksi `entity.aksi`, dan aturan validasi per modul.

Untuk setiap modul: **tujuan**, **data**, **aksi**, **validasi**, **hak akses**, **UI**.

---

## Kontrak API (pondasi semua modul)

Semua komunikasi client-server lewat **satu fungsi**:

```js
google.script.run
  .withSuccessHandler(onSuccess)
  .withFailureHandler(onFail)
  .api('transactions.list', { periode: '2026-10', tipe: 'expense' });
```

**Bentuk balasan selalu sama:**

```json
{ "ok": true,  "data": { ... }, "error": null }
{ "ok": false, "data": null,    "error": { "code": "FORBIDDEN", "message": "..." } }
```

**Kode error standar:**

| Kode | Arti |
|---|---|
| `UNAUTHENTICATED` | Email tidak terdaftar di `users` |
| `FORBIDDEN` | Role tidak cukup |
| `VALIDATION` | Input tidak lolos validasi (pesan per-field dikirim) |
| `NOT_FOUND` | Baris tidak ada / sudah `void` |
| `CONFLICT` | `rev` tidak cocok — ada orang lain yang mengedit |
| `LOCK_TIMEOUT` | Sheet sedang dikunci (> 30 detik) |
| `SERVER` | Error tak terduga (sudah dicatat di log) |

**Daftar aksi yang tersedia** (nama selalu `entity.aksi`):

| Prefix | Entitas |
|---|---|
| `auth.` | `auth.me`, `auth.bootstrap` |
| `dash.` | `dash.summary` |
| `txn.` | `list`, `create`, `update`, `delete`, `bulk_create` |
| `review.` | `monthly`, `compare`, `by_category`, `trend` |
| `bill.` | `list`, `create`, `update`, `delete`, `pay`, `generate` |
| `rec.` | `list`, `create`, `update`, `delete` |
| `att.` | `list`, `upsert`, `delete`, `quota`, `calendar` |
| `cal.` | `list`, `create`, `update`, `delete`, `toggle_done` |
| `svc.` | `list`, `create`, `update`, `delete`, `due`, `asset.*` |
| `note.` | `list`, `create`, `update`, `delete` |
| `fam.` | `members.list`, `members.create`, `members.update`, `members.delete`, `notes.*` |
| `cfg.` | `get`, `set`, `categories.*`, `users.*` |

---

## Struktur Folder Project

```
FAMILY_OS/                          (Google Apps Script project)
├── appsscript.json                 Manifest: oauthScopes, timezone, webapp access
├── Code.gs                         Entry point: doGet, api(), dispatcher
├── Core/
│   ├── Config.gs                   ID spreadsheet, nama sheet, konstanta
│   ├── Sheet.gs                    readTable_ / appendRow_ / updateRow_ (header-based)
│   ├── Guard.gs                    auth, role check, validasi
│   ├── Api.gs                      dispatcher + pembungkus response
│   └── Audit.gs                    tulis audit_log
├── Domain/
│   ├── Dashboard.gs
│   ├── Transactions.gs
│   ├── Bills.gs
│   ├── Recurring.gs
│   ├── Review.gs
│   ├── Attendance.gs
│   ├── Calendar.gs
│   ├── Service.gs
│   └── Notes.gs
├── Triggers/
│   ├── Setup.gs                    pasang trigger harian
│   ├── DailyDigest.gs              notifikasi 07:00
│   └── MonthlySnapshot.gs          rekap tanggal 1
├── views/
│   ├── index.html                  shell + semua view
│   ├── styles.css
│   ├── js/
│   │   ├── api.js                  wrapper google.script.run
│   │   ├── state.js                store + cache
│   │   ├── ui.js                   helper render (modal, toast, table, confirm)
│   │   ├── charts.js               Chart.js wrapper
│   │   └── views/                  dash, txn, review, bill, att, cal, svc, note, cfg
│   └── vendor/
│       └── chart.min.js            lokal (bukan CDN, biar offline & stabil)
└── README.md                       panduan deploy untuk Kakang
```

> Kenapa `vendor/chart.min.js` lokal, bukan CDN: HtmlService bisa diblokir CSP
> di beberapa kondisi, dan kalau CDN turun, Dashboard kosong. File lokal
> hanya ~200 KB dan selalu ikut ter-deploy.

---

## MODUL 0 — Autentikasi & Shell

**Tujuan:** Mengetahui siapa yang masuk, lalu menampilkan app sesuai haknya.

| Aksi | Deskripsi |
|---|---|
| `auth.me` | Baca `Session.getActiveUser().getEmail()`, cari di `users`. Kalau tidak ketemu atau `aktif=TIDAK` → `UNAUTHENTICATED` dengan pesan "Hubungi admin untuk mendaftarkan email ini" |
| `auth.bootstrap` | Kirim sekali di load: profil user, settings, daftar kategori, daftar scope. Client menyimpan di memory, tidak perlu fetch ulang |

**Perilaku:**
- Kalau `UNAUTHENTICATED`, UI menampilkan layar "Akses Ditolak" dengan email yang terdeteksi + tombol salin. Bukan redirect paksa — lebih mudah didiagnosis.
- Halaman tetap memuat semua aset JS/CSS (GAS tidak bisa mengunci aset per user), tapi **tidak ada data** yang terkirim sebelum `auth.me` lolos.

**UI:**
- Header: nama keluarga · nama user · role badge · tombol refresh · tombol logout (link ke `https://accounts.google.com/Logout`)
- Sidebar: 7 menu modul + Settings (khusus admin)
- Mobile: sidebar jadi bottom-nav atau drawer

---

## MODUL 1 — Dashboard ("Kondisi")

**Tujuan:** Satu layar menjawab "keadaan kita hari ini".

| Kartu | Isi | Sumber |
|---|---|---|
| **Saldo bulan ini** | Total income − total expense bulan berjalan + saldo awal periode | `monthly_snapshot` + `transactions` |
| **Saldo per rekening** | Satu kartu per `account` aktif: saldo hari ini, warna merah kalau negatif | `accounts` + `transactions` |
| **Pengeluaran bulan ini** | Nominal + progress bar vs total budget | `transactions` + `categories.budget_bulanan` |
| **Sisa hari** | Sisa budget harian = (sisa budget) / (sisa hari) | Dihitung |
| **Income breakdown** | Gaji / Side job / Lainnya | `transactions` tipe income |
| **Tagihan terdekat** | 5 tagihan terdekat yang `belum` | `bills` |
| **Tagihan terlambat** | Jumlah + nominal, warna merah | `bills` |
| **Agenda 7 hari** | Acara keluarga + rencana +FILES cuti | `calendar_events` + `attendance` |
| **Absensi hari ini** | Status hari ini + sisa jatah cuti & izin | `attendance` + `attendance_quota` |
| **Service jatuh tempo** | Motor/rumah yangdue ≤ 30 hari atau ≤ 500 km | `service_asset` + `service_log` |

**Aksi:** `dash.summary` (read-only)

**Warna status (konsisten di seluruh app):**

| Warna | Arti |
|---|---|
| Hijau | Lunas / aman / dalam budget |
| Kuning | Mendekati batas (± 20%) |
| Oranye | Lewat jatuh tempo ≤ 3 hari |
| Merah | Terlambat / over budget |

**Sorting & batas:** Tagihan diurutkan `jatuh_tempo` ASC. Semua query di-filter
`periode >= bulan_berjalan` supaya tidak scan seluruh sheet.

---

## MODUL 2 — Keuangan (Transaksi)

**Tujuan:** Input cepat (< 10 detik) + koreksi aman.

### 2A. Input Cepat (grid kartu)

Layar utama modul: **grid tombol besar** per kategori, grouped per tipe.

```
PEMASUKAN                      PENGELUARAN
[ Gaji      ] [ Side Job ]     [ Makan    ] [ Bensin  ]
[ Lembur    ] [ Bonus    ]     [ Listrik  ] [ Internet]
[+]                           [ Baju     ] [ Kas   ]
```

Klik kategori → **bottom sheet** muncul, sudah terisi kategori, sisa field minimal:
`jumlah` (keyboard angka langsung fokus) + `tanggal` (default hari ini) +
`rekening` (default = rekening terakhir yang dipakai user) + `keterangan` (opsional).
Tombol "Simpan" besar di bawah. Selesai dalam 3 ketukan.

**Kenapa bukan form panjang:** Istri akan dipakai hampir setiap hari. Form 12 field
adalah alasan orang berhenti memakai aplikasi.

### 2B. Daftar Transaksi

| Fitur | Detail |
|---|---|
| Filter | Periode, tipe, kategori, scope, metode, rentang tanggal, tags |
| Kolom | Tanggal, Kategori, Keterangan, Jumlah, Metode, Sumber (`Manual` / `Auto`), Aksi |
| Sort | Default tanggal DESC |
| Paginasi | 50 baris per halaman (server-side) |
| Aksi baris | Edit (jika boleh), Soft delete, Duplikat (untuk transaksi rutin) |

### 2C. Validasi (server, wajib)

| Field | Aturan |
|---|---|
| `tanggal` | Wajib. Tidak boleh < `settings.mulai_data`. Tidak boleh > hari ini + 1 hari |
| `kategori_id` | Wajib. Harus ada di `categories` dan `aktif=YA` |
| `jumlah` | Wajib. Angka, min 1.000, max 9.999.999.999 |
| `account_id` | Wajib. Harus ada di `accounts` dan `aktif=YA` |
| `scope` | Wajib. Harus cocok dengan `kategori.scope` (kategori keluarga tidak boleh dipakai untuk scope pribadi — atau memang boleh? **keputusan: boleh**, dengan peringatan di UI) |
| `metode` | Wajib, dari enum |
| `keterangan` | Maks 500 karakter |
| `bill_id` | Opsional. Kalau diisi, sistem validasi bahwa tagihan-nya `belum` dan nominal cocok (± 5%) |

### 2D. Konflik edit

`update` mengirim `rev` yang dibaca. Kalau `rev` di sheet sudah berbeda:

```
⚠️ Data ini sudah diubah oleh Istri 5 menit lalu (Belanja bulanan
   Rp 450.000 → Rp 480.000). Muat ulang?
   [Muat ulang]  [Batalkan]
```

Tidak ada "last write wins" diam-diam. Itu sumber data kacau.

---

## MODUL 3 — Review & Analitik

**Tujuan:** Bukan sekadar menyimpan angka, tapi **menjelaskan** angkanya.

| Laporan | Isi |
|---|---|
| **Ringkasan bulan** | Income, expense, selisih, transaksi terbanyak, hari boros tersibuk |
| **vs Budget** | Table per kategori: budget / realisasi / sisa / % / status warna |
| **vs Bulan Lalu** | Δ per kategori, urutkan dari yang paling berubah |
| **Tren 12 bulan** | Grafik batang: income vs expense per bulan |
| **Komposisi** | Grafik donat: pengeluaran per kategori bulan ini |
| **Top 5 pengeluaran** | 5 transaksi terbesar |
| **Prediksi** | Rata-rata harian × sisa hari = estimasi akhir bulan. Warna merah jika tembus budget |

**Aksi:** `review.monthly`, `review.compare`, `review.by_category`, `review.trend`

**Grafik:** 3 jenis saja (bar, line, doughnut). Makin banyak jenis grafik,
makin mahal untuk rawat dan makin jarang dipakai.

---

## MODUL 4 — Tagihan & Cicilan

**Tujuan:** Tidak ada tagihan yang terlewat.

### 4A. Daftar Tagihan

Kelompokkan per status:
- **⚠ Terlambat** (merah)
- **📅 Minggu Ini**
- **📆 Bulan Ini**
- **✅ Lunas Bulan Ini**

Kolom: nama · jumlah · jatuh tempo · sisa hari · status · aksi `Bayar`.

### 4B. Bayar Tagihan

Klik `Bayar` → dialog konfirmasi berisi:

```
Bayar: Listrik PLN
Jumlah tagihan : Rp 350.000
Jumlah bayar   : [ Rp 350.000 ]   <- bisa diubah (tagihan nyata bisa beda)
Jenis          : Tunai
Tanggal        : 2026-10-11
Kategori       : Tagihan (auto)

[ Batal ]  [ Simpan & Tandai Lunas ]
```

Efeknya **satu operasi**: buat baris `transactions` + set `bills.status=lunas` + `lunas_pada` + `txn_id` + tulis audit. Semua dalam satu `LockService`.

### 4C. Cicilan

Kartu khusus: `Cicilan Motor — 7 dari 24 · Sisa Rp 12.450.000 · Selesai 2028-05`
Progress bar. When dibayar otomatis naikkan `cicilan_ke`. Kalau sudah `= total_cicilan`, berhenti generate.

### 4D. Generate Tagihan

Tombol `Generate Tagihan Bulan Ini` di halaman admin. Menjalankan `recurring` yang jatuh tempo bulan ini → buat baris `bills`.
Transaksi **tidak** otomatis dibuat. Yang bayar manusia yang memutuskan.

> Kenapa tidak auto-create transaksi? Karena "tagihan sudah dibuat" ≠ "sudah dibayar".
> Mencampur keduanya bikin saldo berbohong.

---

## MODUL 5 — Absensi

**Tujuan:** Rekam kehadiran + tahu sisa jatah.

| Fitur | Detail |
|---|---|
| **Kalender bulanan** | Grid 7 kolom. Setiap hari = 1 sel berisi chip status (warna berbeda). Tap = isi/edit |
| **Isi cepat** | Tombol: Hadir / Izin / Cuti / Sakit / Libur. Pilih tanggal di header, lalu tap tombol |
| **Wajib alasan** | Izin / Cuti / Sakit → input alasan._validation di server |
| **Rencana** | Toggle `terjadwal` untuk cuti yang sudah direncanakan |
| **Sisa jatah** | Progress bar: `Terpakai 4 / 12 cuti` per orang |
| **Rekap** | Table per bulan: hadir / izin / cuti / sakit / lembur |

**Warna status:**

| Status | Warna |
|---|---|
| Hadir | Hijau |
| Izin | Biru |
| Cuti | Kuning |
| Sakit | Merah muda |
| Libur/Hari besar | Abu-abu (dari kalender, auto) |
| Belum diisi | Putih + border putus-putus |

**Aksi:** `att.list`, `att.upsert`, `att.delete`, `att.quota`, `att.calendar`

---

## MODUL 6 — Kalender

**Tujuan:** Semua agenda dalam 1 kalender, tanpa tab terpisah.

**Tampilan:** 2 mode
- **Month view** — grid tanggal, titik berwarna per kategori. Popup hari = daftar acara.
- **Agenda view** — list dikelompokkan per hari ke depan (agenda 30 hari).

**Filter kategori:** Keluarga · Liburan · Rencana · Kerja · Spiritual · Ulang Tahun
Semua di checkbox. Default semua aktif.

**Fitur penting:**
- **Rencana dengan biaya** → `biaya_rencana`. Tapi **belum** jadi transaksi.
  Ada tombol "Catat sebagai Pengeluaran" kalau sudah dibayar. Ini menjembatani
  rencana →-realita tanpa memaksa.
- **Checklist rencana** → `selesai` YA/TIDAK + progress bar di atas modul
- **Reminder** → tampil di Dashboard (7 hari) + email pagi

**Validasi:** `tanggal_selesai >= tanggal_mulai`. `jam_selesai > jam_mulai` kalau keduanya diisi.

---

## MODUL 7 — Log Service (Motor & Rumah)

**Tujuan:** Tidak ada lagi "kapan terakhir ganti oli?" — jawabannya ada.

### 7A. Daftar Aset

Kartu per aset: nama · grup · lokasi · **jatuh servis berikutnya** · status warna.
Klik → halaman detail aset.

### 7B. Detail Aset

| Section | Isi |
|---|---|
| **Info** | Nama, merek, tipe, tahun, no seri, lokasi, interval hari/km, foto |
| **Status Servis** | Terakhir servis (tanggal + km) · Berikutnya (tanggal + km) · Sisa hari · Sisa km |
| **Riwayat** | Table semua service_log (tanggal, jenis, km, biaya, vendor, nota) + total biaya kumulatif |
| **Grafik** | Biaya perawatan per tahun (bar chart) |
| **Aksi** | `Catat Servis` — dialog: tanggal, km, jenis, biaya, vendor, parts, foto → tombol `Simpan & Buat Transaksi` |

> Kolom `Biaya Kumulatif` itu intsinya. "Motor sudah habis Rp 4,2 juta untuk
> perawatan sejak 2021" adalah informasi yang tidak pernah ada di kepala orang.

### 7C. Ringkasan Due

Dashboard modul: daftar semua aset yang due ≤ 30 hari atau ≤ 500 km, urut dari yang
paling mendesak.

---

## MODUL 8 — Catatan

**Tujuan:** Wadah bebas untuk hal yang tidak masuk kategori mana pun.

- Grid kartu: judul + cuplikan isi + tanggal + badge kategori + ikon pin
- Editor: textarea sederhana (tanpa markdown renderer — plain text cukup dan
  Mustache `{{x}}` jadi lebih mudah dibaca langsung di sheet)
- Search sederhana: client-side filter judul + isi (data catatan kecil)
- Pin ke atas

---

## MODUL 8B — Keluarga (Papan Profil Anggota) — lihat D17

**Tujuan:** Satu tempat untuk **data tentang orang**, bukan jadwal dan bukan biaya.
Keluarga butuh tahu: siapa anggota, golongan darah/alergi, dokternya siapa,
nomor darurat, dan di mana dokumen pentingnya. Jadwal → Kalender; biaya → Keuangan.

**Data:** `family_members` (profil) + `family_notes` (satu tabel, kolom `bagian`).

| Aksi | Deskripsi |
|---|---|
| `fam.members.list` | Daftar anggota (aktif & non-aktif), urut `peran` lalu `nama` |
| `fam.members.create/update/delete` | CRUD profil anggota. `delete` = soft delete (`void`) |
| `fam.notes.list` | Catatan keluarga, filter opsional `bagian` (`medis`\|`kontak`\|`dokumen`) |
| `fam.notes.create/update/delete` | CRUD catatan keluarga. `bagian` wajib |

**Validasi:**
- `nama` wajib; `inisial` dihitung dari nama kalau kosong (maks 2 huruf, uppercase)
- `tanggal_lahir` format `YYYY-MM-DD`, tidak boleh di masa depan
- `golongan_darah` hanya `A`/`B`/`AB`/`O` (atau kosong)
- `nomor_wa` hanya digit, `-`, `+`, spasi (dinormalisasi saat tampil)
- `berlaku_sampai` **hanya** diizinkan untuk `bagian=dokumen`; kalau diisi di
  bagian lain → `VALIDATION`
- `bagian` tidak boleh `anggota` (anggota lewat `fam.members.*`, bukan `fam.notes.*`)

**Hak akses:** lihat + tambah = semua user; **ubah/hapus profil** = admin
(menyentuh data orang lain). Mengikuti D1.

**UI:**
- Dropdown bagian di tab Keluarga: `Semua Keluarga` · `Anggota` · `Info Medis` ·
  `Kontak & Darurat` · `Dokumen Penting` (badge jumlah) — satu-satunya filter
- **Anggota** = grid kartu profil: avatar inisial, nama, peran, umur (dihitung
  dari `tanggal_lahir`, tidak disimpan), golongan darah, alergi, nomor WA.
  Kartu lebih lebar dari kartu item biasa (1 kolom di HP) karena memuat detail
- **Info Medis / Kontak & Darurat / Dokumen Penting** = daftar kartu
  (judul + info singkat + badge). Dokumen menampilkan masa berlaku
- Form "Tambah ke Keluarga": pilih bagian → judul → info singkat

> **Jangan taruh di sini:** jadwal imunisasi/kontrol (→ Kalender, kategori
> `kesehatan`), SPP/les/biaya sekolah (→ Keuangan, kategori `pendidikan`),
> acara anak (→ Kalender, kategori `anak`).

---

## MODUL 9 — Notifikasi WhatsApp via Fonnte (Trigger)

**Tujuan:** Yang tidak dibaca di WA tidak akan dibayar. Email dihapus (D3 revisi).

### 9A. Daily Digest WA (harian, jam dari `settings.jam_notifikasi` default 07:00)

Kirim ke **grup WA keluarga** via Fonnte. Format pesan:

```
*Bayt Mustaqbal — Ringkasan 11 Okt 2026*

🔴 *TERLAMBAT (2)*
• Listrik PLN — Rp 350.000 (tempo 9 Okt, 2 hari)
• Asuransi kendaraan — Rp 650.000 (tempo 4 Okt, 7 hari)

🟡 *MINGGU INI (1)*
• Internet IndiHome — Rp 350.000 (tempo 15 Okt)

📅 *AGENDA 7 HARI (3)*
• 12 Okt — Ulang tahun ibu (Keluarga)
• 14 Okt — Screening anak (Keluarga)
• 16 Okt — Liburan Bromo (Liburan, 3 hari)

🏍️ *SERVICE (1)*
• Motor Beat — Servis berkala — due 21 Okt (10 hari)

💰 *KEUANGAN BULAN INI*
Masuk Rp 8.400.000 · Keluar Rp 5.230.000 · Sisa Rp 3.170.000
Budget tersisa Rp 1.770.000 / 20 hari (Rp 88.500/hari)

_Baytmustaqbal.my.id/os_
```

**Aturan kirim:**
- Kalau semua section kosong → **tidak kirim** (hindari spam grup)
- Section yang kosong → tidak ditampilkan
- Dicatat ke `notification_log` (channel = `WA`)

### 9B. Reminder Tagihan Spesifik (per `bills.remind_at`)

Untuk tagihan yang butuh jam pasti (iuran sampah, dll):
- Trigger cek setiap jam (atau setiap 15 menit via time-driven trigger)
- Kalau `remind_at` ≤ sekarang DAN `remind_sent = TIDAK` → kirim WA:

```
⏰ *Pengingat Tagihan*
*Iuran Sampah RT* — Rp 50.000
Jatuh tempo: *Hari ini, 11 Okt 2026*
Status: *Belum Lunas*

[Bayar Sekarang]  (deep link ke app)
```

- Setelah terkirim → `remind_sent = YA`

### 9C. Trigger yang Dipasang

| Trigger | Waktu | Fungsi |
|---|---|---|
| `DailyDigestWA` | Setiap hari `settings.jam_notifikasi` | Kirim ringkasan harian ke WA grup |
| `BillReminderCheck` | Setiap jam (atau 15 menit) | Cek `bills.remind_at` yang due |
| `MonthlySnapshot` | Tanggal 1, 00:15 | Tutup rekap bulan lalu |
| `GenerateRecurring` | Tanggal 1, 00:30 | Generate tagihan rutin bulan baru |

> Semua trigger dibuat lewat `ScriptApp.newTrigger()`, **tidak** diklik manual.
> Trigger manual mati dalam 30 hari. Ini wajib via code saat setup.

### 9D. Kirim WA via Fonnte (Server-side)

```javascript
function sendWA_(pesan, target = null) {
  const token = getSetting_('fonnte_token');
  const device = getSetting_('fonnte_device') || 'default';
  const to = target || getSetting_('fonnte_target');
  if (!token || !to) { throw new Error('Fonnte token/target belum diset'); }
  
  const payload = { target: to, message: pesan, device: device };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const resp = UrlFetchApp.fetch('https://api.fonnte.com/send', options);
  const json = JSON.parse(resp.getContentText());
  if (json.status !== true) { throw new Error(json.reason || 'Fonnte gagal'); }
  return json;
}
```

> **Rate limit Fonnte**: ~30 detik/req untuk free tier. `BillReminderCheck` pakai `LockService` + `Utilities.sleep(1000)` antar kirim kalau ada banyak sekaligus.

---

## MODUL 10 — Settings & Master Data (Admin Only)

| Section | Isi |
|---|---|
| **Umum** | Nama keluarga, mata uang, tanggal mulai data |
| **Budget** | Total budget bulanan + budget per kategori |
| **Notifikasi (WA)** | Jam harian, target grup WA, token Fonnte, device, channel (WA/EMAIL/BOTH) |
| **Kategori** | CRUD kategori (income/expense), reorder, warna, budget, aktif |
| **Transaksi Rutin** | CRUD template recurring, preview generate |
| **Pengguna** | Tambah/hapus akun, ubah role |
| **Pemeliharaan** | Jalankan ulang generate, tes kirim WA, arsip bulanan, reset cache |

**Peringatan di UI:** setiap aksi di sini menulis `audit_log` dan **tidak bisa**
dibatalkan. Konfirmasi denganKetik "YA" untuk aksi destruktif.

---

## Desain Visual

**Prinsip:** tenang, cepat dibaca, angka besar.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--bg` | `#0f1419` (dark) / `#f7f8fa` (light) | Latar |
| `--surface` | `#1a2029` / `#ffffff` | Kartu |
| `--text` | `#e6e9ef` / `#1a1d21` | Teks utama |
| `--muted` | `#8b95a5` | Teks sekunder |
| `--accent` | `#2f81f7` | Aksi utama |
| `--ok` `--warn` `--danger` | `#3fb950` `#d29922` `#f85149` | Status |

**Tipografi:**
- Angka uang: font tabular (mis. `font-variant-numeric: tabular-nums`) supaya kolom sejajar
- Judul angka dashboard: 32–40px, weight 700
- Body: 14–15px, line-height 1.5
- Font: `-apple-system, 'Segoe UI', Roboto, sans-serif` (tanpa webfont = lebih cepat)

**Layout:**
- Desktop: sidebar 240px + konten max-width 1200px
- Mobile: bottom tab bar 5 menu + "⋯" untuk sisanya

**Aksesibilitas:**
- Kontras teks minimal AA (4.5:1)
- Semua angka penting punya label teks, tidak hanya dibedakan warna
- Target sentuh minimal 44×44px di mobile

---

## Yang Sengaja Tidak Dibuat (dan alasannya)

| Ide | Alasan tidak dibuat |
|---|---|
| Drag-and-drop urut kategori | Urut bisa diubah lewat angka `urutan`. Drag-drop di Sheet-backed app = kompleksitas tanpa manfaat besar |
| Multi-user real-time (WebSocket) | Sheets tidak mendukung. Cukup — polling saat halaman dibuka sudah memadai untuk 2 orang |
| Upload foto nota | **Diputuskan tidak dibuat** (D12). Kolom dihapus dari skema, bukan "ditunda" |
| Import bank statement | API bank tidak gratis/rapuh. Kalau perlu, impor CSV manual di Fase 4 |
| Edit transaksi auto-recurring | Melanggar aturan #2 di dokumen arsitektur. Perbaiki template, bukan hasil |
| Template nota / cetak PDF | Niche. Kalau butuh, print CSS di browser sudah cukup |