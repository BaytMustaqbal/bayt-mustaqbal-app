# 04 — KEPUTUSAN TERKUNCI

Dokumen ini merekam **keputusan yang sudah diambil** beserta alasannya.
Kalau nanti ada yang bertanya "kenapa begini?", jawabannya ada di sini.
Kalau keputusan ini mau diubah, **ubah di sini dulu**, baru ubah kodenya.

---

## D1 — Hak Akses: Kakang = Admin, Istri = User

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Admin + User (dipilih)** | Kakang penuh; Istri view + input harian | Paling aman & umum. Istri bisa catat pengeluaran & acara tanpa risiko merusak master data. Butuh tabel role |
| B. Dua-duanya full | Tidak ada role | Sederhana, tapi salah edit master kategoriipi satu orangCQ masalah semua orang |
| C. Istri read-only | Istri hanya lihat | Terlalu kaku — input harian harus lewat Kakang, tidak praktis |
| D. Multi-level (3 role) | Admin/Editor/Viewer | Over-engineering untuk 2 orang sekarang |

**Konsekuensi teknis:**
- Kolom `role` di tabel `users`
- 7 endpoint hanya untuk admin (`cfg.*`, `rec.*`, `audit`)
- Aturan "edit transaksi milik sendiri < 24 jam" untuk user biasa
- UI menyembunyikan tombol yang tidak diizinkan (tapi **tetap** divalidasi di server)

---

## D2 — Bentuk Aplikasi: Satu Web App, Navigasi Tab

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Satu Web App (dipilih)** | 1 `index.html`, semua modul, navigasi sidebar/hash-router | Satu URL, satu login, style konsisten, mudah dirawat |
| B. Beberapa Web App terpisah | 7 app, 7 deploy, 7 URL | Kode duplikat, style tidak sinkron, berat rawat |
| C. Sheet-native | Menu custom bawaan Sheet | Cepat, tapi tampilan kasar, tidak ada dashboard/grafik/validasi |

**Konsekuensi teknis:**
- Hash routing: `#/dash`, `#/keuangan`, `#/absensi`, dst
- JS modular lewat `<?!= include('js/api') ?>`
- Satu `styles.css` global + utility classes

---

## D3 — Notifikasi Email Diprioritaskan, Impor Data Lama Ditunda

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Email dulu, impor menyusul (dipilih)** | Trigger harian + daily digest |Notifikasi paling berdampak: tagihan yang terlewat itu mahal. Data lama bisa diinput manual 1-2 bulan sampai habit terbentuk |
| B. Email + impor CSV sekaligus | Semua dari awal | Lebih lengkap, tapi format data lama sering berantakan dan perlu effort cleansin |
| C. Tanpa email dulu | Paling ringan | Justru bagkickoolan yang paling sering terlupakan |

**Konsekuensi teknis:**
- Semua trigger wajib dibuat via `ScriptApp.newTrigger()` saat install (bukan klik manual)
- Daily digest skip kalau tidak ada isi
- Kolom `extra_*` disiapkan supaya Fase 4 bisa nambah kolom tanpa bikin kode rusak

---

## D4 — Sheets Sebagai Sumber Data

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Google Sheets (dipilih)** | 1 spreadsheet, 15 tab | Gratis, mudah dilihat & dibetulkan manual, backup otomatis Google, 2 pengguna jauh di bawah batas |
| B. Database eksternal (Supabase/Firebase) | API terpisah | Lebih kuat, tapi perlu API key, biaya, dan 2 sumber kebenaran. Over-engineering untuk 2 orang |
| C. Sheets dulu, migrasi nanti | Hybrid | Sama dengan A secara praktis |

**Konsekuensi teknis (WAJIB dipatuhi):**
- Semua query **wajib** berbasis nama header, bukan indeks kolom
- Semua operasi tulis dibungkus `LockService`
- Setiap baris punya `rev` untuk deteksi konflik
- Soft delete (kolom `void`) — data keuangan tidak boleh hilang fisik

---

## D5 — Satu Tab untuk Semua Jenis Agenda

**Tanggal:** 11 Oktober 2026

Tab terpisah "Kalender Keluarga", "Kalender Liburan", "Rencana" **ditolak**.
Semuanya masuk `calendar_events`, dibedakan kolom `kategori`.

**Alasan:** makin banyak tab, makin besar peluang user salah pilih tab dan data
terlantar. Filter visual jauh lebih mudah dipakai daripada memilih tab yang benar.

---

## D6 — `recurring` dan `bills` Dipisah

**Tanggal:** 11 Oktober 2026

| Konsep | Sifat | Jumlah baris |
|---|---|---|
| `recurring` | Template aturan ("gaji tiap tanggal 25") | 5–10 |
| `bills` | Instance nyata per periode ("gaji Okt 2026, belum lunas") | Puluhan/tahun |
| `transactions` | Uang benar-benar bergerak | Ratusan/tahun |

**Alasan:** Kalau dicampur, "tagihan sudah dibuat" dan "tagihan sudah dibayar"
menjadi satu baris — saldo jadi berbohong. Pemisahan ini adalah inti integritas
data FAMILY OS.

---

## D7 — Tidak Ada Build Step, Tidak Ada Framework

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Vanilla JS (dipilih)** | HTML + CSS + JS murni, tanpa npm | Deploy = copy file. Tidak ada `node_modules`, tidak ada bundler rusak. 2 orang aktif = 200-500 baris JS per modul masih wajar |
| B. React + build | Vite/webpack + npm | Lebih bagus untuk app besar. Tapi menambah titik kegagalan (versi, build cache, deploy 2 langkah) tanpa manfaat untuk skala ini |
| C. jQuery + plugin | Kerangka lama | Usang, tapi ringan. Vanilla modern sudah cukup |

**Library tunggal yang diizinkan:** Chart.js (vendored lokal). Itu saja.
Bukan karena malas mencari, tapi karena tidak ada alasan kuat untuk menambah
dependency lain yang harus dirawat.

---

## D8 — Tanpa Web Font (pakai font sistem)

**Tanggal:** 11 Oktober 2026

Gunakan system font stack. Alasan: web font menambah 200-400 KB, menyebabkan
flash of invisible text, dan hasilnya hampir tidak terlihat bedanya untuk aplikasi
utility seperti ini.

---

## D9 — Aturan Edit 24 Jam

**Tanggal:** 11 Oktober 2026

Transaksi bisa diedit/delete oleh pembuatnya selama 24 jam. Setelah itu, hanya admin.

**Alasan:** Kesalahan input biasanya terjadi 5 menit setelah input. Setelah 24 jam,
data dianggap final. Ini menyeimbangkan antara "bisa dikoreksi cepat" dan "data
terlindungi dari perubahan diam-diam".

---

## D10 — Dua Versi Deploy

| Versi | Execute as | Akses | Untuk |
|---|---|---|---|
| `dev` | Me | Myself saja | Testing Kakang |
| `prod` | Me | Anyone with Google account | Kakang + Istri |

**Alasan:** Test dulu di sandbox. Kalau ada bug yang corrup data, lebih baik kena
spreadsheet dev. Naikkan ke prod hanya setelah lewat.

---

## D11 — Rekening / Sumber Dana AKTIF sejak Fase 1

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Aktifkan (dipilih)** | Tiap transaksi punya `account_id`; Dashboard menampilkan saldo per rekening | Cash habis vs saldo BCA aman itu informasi yang paling bikin cemas. Kalau ditunda, transaksi lama jadi tidak punya sumber dana dan tidak bisa dihitung retroaktif |
| B. Tidak perlu, cukup total | Total keseluruhan saja | Sederhana, tapi kehilangan informasi yang paling dibutuhkan |
| C. Tunda, default "Umum" | Satu wallet dulu | Tetap punya masalah migrasi yang sama seperti B |

**Konsekuensi teknis:**
- Tab `accounts` berisi 3 seed: `Cash`, `BCA`, `GoPay`
- Kolom `account_id` WAJIB ada di `transactions` sejak baris pertama
- `kartu_kredit=YA` → transaksinya jadi kewajiban, masuk `bills`, bukan expense riil
- Kolom `saldo_terakhir` hanya cache; hasil rumus hitung ulang yang menang

---

## D12 — Bukti Foto Nota: TIDAK Dibuat

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Tidak dulu, cukup teks (dipilih)** | Kolom `bukti_url` dihapus dari skema | Kalau butuh bukti: foto di HP, simpan manual di folder Drive. Handler upload binary + resize menambah beban di fase yang tujuannya hanya validasi apakah app dipakai |
| B. Fase 2, upload ke Drive | Kolom URL foto + handler upload | Berguna untuk klaim asuransi, tapi bukan kebutuhan harian |
| C. Masuk Fase 1 | Upload sejak MVP | Menambah titik kegagalan di fase paling awal |

**Konsekuensi teknis:**
- Kolom `bukti_url` / `foto_url` **dihapus** dari `transactions`, `service_log`, `service_asset`
- Kalau nanti dibutuhkan, cukup tambah kolom `extra_bukti` — semua query berbasis header, jadi tidak ada kode yang rusak

---

## D13 — Tagihan Variabel: Estimasi + Edit Sebelum Bayar

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Estimasi + edit (dipilih)** | Bill dibuat dengan `estimasi=YA`; dialog Bayar mewajibkan konfirmasi nominal | Tidak ada angka yang mengada-ada. Kalau listrik melonjak, angkanya dikoreksi sebelum masuk laporan |
| B. Auto rata-rata 3 bulan | Hitung dari riwayat | Lebih pintar, tapi salah kalau ada lonjakan musiman (AC, liburan) |
| C. "Belum diketahui" + inbox | Tidak ada nominal, hanya pengingat | Paling jujur, tapi tiap hari harus cek manual. Friction berarti tidak dipakai |

**Konsekuensi teknis:**
- `bills.estimasi` = `YA`/`TIDAK`
- `bills.jumlah` pada bill `estimasi=YA` **tidak boleh** dipakai sebagai angka laporan anggaran sebelum `status=lunas`
- Validasi di `pay()`: `jumlah` yang dikonfirmasi user adalah yang tersimpan

---

## D14 — Hari Libur Nasional: Hardcode di Settings

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Hardcode (dipilih)** | `settings.hari_libur` = CSV `YYYY-MM-DD` | Nol dependency, selalu jalan. Tambah daftar baru cukup 1 menit setiap awal tahun |
| B. Ambil dari API eksternal | Fetch dari API kalender publik | Lebih akurat, tapi bergantung pihak ketiga. Kalau down, kalender ikut error |
| C. Manual tiap tahun lewat Kalender | Hari libur jadi agenda biasa | Paling sederhana, tapi kerja 2x setiap tahun dan mudah lupa |

**Konsekuensi teknis:**
- `settings.hari_libur` — CSV tanggal, dibaca sekali saat bootstrap
- Kalender: sel tanggal libur diberi warna abu-abu + label
- Absensi: hari libur tidak dihitung sebagai "belum diisi"
- Kolom `extra_tahun_libur` disiapkan kalau nanti perlu pisah per tahun

---

## D15 — Notifikasi Hanya WhatsApp via Fonnte

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **B. Hanya WA, email dihapus (dipilih)** | Daily digest + reminder tagihan dikirim ke grup WA via Fonnte. Email dihapus total. | WA grup "terbaca" 100% vs email jarang dibuka. Satu channel = lebih simpel, tidak ada duplikasi logika. Risiko: kalau Fonnte down/tidak bayar = tidak ada notif. Mitigasi: cek rutin di Settings. |
| A. WA grup + email fallback | Keduanya jalan | Redundan, tapi 2x maintenance. Email sudah terbukti tidak dibaca. |
| C. WA pribadi masing-masing | Kirim ke nomor Kakang & Istri | Personal tapi tidak ada "saksi" grup. Lebih mudah diabaikan. |
| D. Keduanya (grup + email) | Maksimal redundansi | Over-engineering untuk skala 2 orang. |

**Konsekuensi teknis:**
- `settings` baru: `fonnte_token`, `fonnte_target` (grup ID `628xx@g.us`), `fonnte_device`, `notifikasi_channel` (default `WA`)
- Hapus `notifikasi_email`, `penerima_notifikasi`, `jam_notifikasi` (diganti `settings.jam_notifikasi` untuk digest harian)
- `DailyDigest.gs` → `DailyDigestWA.gs` pakai `UrlFetchApp` ke `https://api.fonnte.com/send`
- Trigger `BillReminderCheck` cek `bills.remind_at` setiap jam untuk reminder jam pasti (iuran sampah)
- `notification_log.channel` = `WA` | `EMAIL` | `BOTH`

---

## D16 — Iuran Sampah = Tipe Bill Khusus dengan Reminder Jam

**Tanggal:** 11 Oktober 2026

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Tipe bill khusus `iuran_sampah` (dipilih)** | Masuk tabel `bills` dengan `tipe=iuran_sampah`. Punya `remind_at` (datetime) & `remind_channel=WA`. Generate otomatis tiap bulan lewat `recurring`. | Tetap punya status lunas/belum, masuk laporan tagihan, bisa dibayar 1 klik. Bedanya: reminder jam spesifik ke WA grup. |
| B. Reminder mandiri | Sistem terpisah dari bills | Fragmentasi: tagihan tidak punya status, tidak masuk laporan, tidak bisa dibayar 1 klik. |
| C. Masuk kalender saja | Event kalender dengan reminder | Tidak punya status lunas, tidak masuk keuangan, tidak bisa track histori pembayaran. |

**Konsekuensi teknis:**
- `bills.tipe` tambah enum `iuran_sampah`
- `bills` tambah kolom: `remind_at` (datetime), `remind_channel` (enum), `remind_sent` (YA/TIDAK)
- `recurring` seed tambah: `Iuran Sampah` — tipe `expense`, frekuensi `bulanan`, `kategori_variabel=TIDAK` (nominal tetap), `remind_at` diset per instance
- UI Bills: filter tambah "Iuran Sampah", kolom "Pengingat" tampil jam
- Deep link di WA: `https://script.google.com/.../exec?page=bills&pay=bill_id` (perlu `doGet` handle param)

---

## Pertanyaan yang MASIH Terbuka

Sisa hal yang belum diputuskan. Perlu dijawab sebelum fase terkait dimulai.

| # | Pertanyaan | Batas | Default kalau tidak dijawab |
|---|---|---|---|
| O5 | Export — CSV per modul atau satu ZIP? | Sebelum Fase 4 | CSV per modul, tanpa ZIP (Apps Script sulit membuat ZIP besar dengan rapi) |
| O6 | Mata uang — perlu kolom nominal luar (USD / mata uang lain)? | Sebelum Fase 1 | Tidak perlu. Satu keluarga satu negara |
| O7 | Format angka uang di UI | Sebelum Fase 1 | `Rp 1.500.000` — format yang paling familier buat keluarga |
| O8 | Apakah Istri punya transaksi rutin sendiri yang perlu pintasan khusus? | Sebelum Fase 1.5 | Tidak ada peran khusus; dia tetap input manual |

---

## Riwayat Keputusan

| Tanggal | ID | Keputusan | Pemicu |
|---|---|---|---|
| 11 Okt 2026 | D1–D10 | Seluruh keputusan awal | Sesi perencanaan bersama Kakang |
| 11 Okt 2026 | D11–D14 | Rekening aktif, tanpa foto, variabel estimasi, libur hardcode | Grill 4 pertanyaan terbuka |