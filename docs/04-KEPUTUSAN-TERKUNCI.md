# 04 — KEPUTUSAN TERKUNCI

> **STATUS — 12 Okt 2026:** Dokumen ini bagian dari rencana **FAMILY OS versi Google Sheets + Apps Script** (11 Okt 2026). **Bagian stack sudah tidak berlaku** — acuan teknis sekarang **Cloudflare Pages (React + Vite di root repo) + Cloudflare Worker + D1**; lihat `README.md` dan `AGENT.md`. **Keputusan produknya tetap berlaku** (D1 admin/user, D5 satu tabel agenda, D6 `recurring` ≠ `bills`, D9 edit 24 jam, D11 rekening aktif, D13 estimasi tagihan, D15 WA via Fonnte, D16 iuran sampah). Disimpan sebagai riwayat: jangan dipakai sebagai acuan teknis sebelum dipetakan ulang ke D1.
>
> **Khusus berkas ini — D4, D7, D8 SUDAH DIGANTIKAN:** D4 (Google Sheets sebagai sumber data) → **D1**; D7 (vanila JS, tanpa build, React ditolak) → **React 18 + Vite + Tailwind, build lewat npm**; D8 (tanpa web font) → **Plus Jakarta Sans**. D1 (admin/user), D2 (satu web app + navigasi tab), D5, D6, D9, D11, D13, D14, D15, D16 tetap berlaku.

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

## D17 — Modul "Keluarga" = Papan Profil Anggota (bukan modul serba-ada)

**Tanggal:** 13 Oktober 2026

Sebelum ini tab **Keluarga** satu-satunya modul **tanpa definisi** — isinya karangan
mock (Anggota / Kesehatan / Pendidikan Anak / Kontak), dan sebagian menampilkan hal
yang sudah punya rumah sendiri (jadwal imunisasi = Agenda; SPP & les = Keuangan).

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Papan profil anggota (dipilih)** | Tab Keluarga = **data tentang orang**: profil anggota (tgl lahir, gol. darah, alergi, WA) + info medis ringkas (dokter, asuransi, obat rutin) + kontak darurat + dokumen penting (masa berlaku). Jadwal/biaya **tidak** diduplikasi. | Satu data satu tempat. Modul jadi jelas batasnya, kecil, dan tidak bersaing dengan Agenda/Keuangan. Butuh tabel anggota + tabel catatan keluarga |
| B. Rapikan 4 bagian lama | Pertahankan Kesehatan/Pendidikan Anak, sekadar sambungkan ke modul lain | Duplikasi tetap ada (jadwal & biaya tampil dua tempat) → data gampang beda |
| C. Bangun penuh | + riwayat kesehatan/tumbuh kembang + nilai sekolah + semua | Melanggar prinsip "jangan bangun modul yang belum dipakai 2 minggu"; jadi mock besar tanpa backend |
| D. Tunda | Catat saja, kerjakan setelah Fase 1 | Tab Keluarga tetap tidak jelas |

**Konsekuensi teknis:**
- Tabel baru (lihat `01-ARSITEKTUR-DATA.md`): **`family_members`** (profil orang) dan
  **`family_notes`** (satu tabel untuk medis/kontak/dokumen, dibedakan kolom `bagian`
  — pola sama seperti D5 "satu tabel agenda", supaya tidak ada tab salah-pilih).
- Kategori bagian: `anggota` · `medis` · `kontak` · `dokumen` (dulu `kesehatan` &
  `pendidikan` **dihapus** dari modul ini).
- **Pendidikan anak tidak punya bagian di sini.** Yang bersifat jadwal/acara → Agenda
  (kategori `anak`); yang bersifat biaya → Keuangan (kategori `pendidikan`).
  Yang benar-benar profil (mis. nama sekolah & kelas) boleh ditaruh sebagai catatan
  `medis`/`lainnya` **atau** ditambahkan sebagai kolom `family_members` kalau nanti terbukti dipakai.
- Info medis yang disimpan = hal **statis** (dokter langganan, BPJS, obat rutin,
  alergi). Jadwal kontrol & imunisasi tetap di Agenda — jangan dipindah ke sini.
- `family_notes.berlaku_sampai` (date, opsional) khusus dokumen — pengingat dokumen
  kedaluwarsa (KTP/paspor/STNK) dikirim lewat jalur notifikasi yang sudah ada (D15).
- **Relasi:** `family_members.user_id` (opsional) → `users.user_id`. Dua entitas
  tetap terpisah (akun login ≠ anggota keluarga) sampai ada kebutuhan nyata
  menyatukannya.

---

## D18 — Latar Belakang = "Blueprint Teknik" (bukan kanvas datar)

**Tanggal:** 13 Oktober 2026

Kanvas app terasa **plain**: pendaran hanya ada di dua sudut **atas** lalu berhenti,
sehingga begitu digulir ke bawah halaman jadi rata navy. Akarnya bukan warna, tapi latar
**tidak berlapis** — padahal gaya kaca (glassmorphism) yang dipakai kartu-kartu app
mensyaratkan latar berlapis/bervibrasi supaya efek kaca punya kedalaman untuk "ditembus".
Tanpa itu kaca ikut terasa datar.

Pilihan diuji lewat halaman pratinjau (mock app di atas 5 varian latar, bisa berganti
tema gelap/terang) sebelum satu baris pun diubah di app.

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Blueprint teknik (dipilih)** | Grid 28px — pola yang **sama** dengan `grid-lines` di belakang chart — dinaikkan ke seluruh kanvas dengan opasitas sangat tipis, ditambah pendaran atas **dan** bawah + vignette + grain halus. **Statis** | Nyambung dengan identitas "instrumen/teknik" app & dunia Tool Room. Tanpa animasi → nol biaya gerak/baterai (penting untuk PWA di HP). Grid jadi motif tingkat sistem, bukan hiasan satu panel. Kanvas tidak lagi "mati" setelah digulir |
| B. Aurora mengalir | 4 gumpalan besar (biru/cyan/violet/hijau) mengalir 24 detik + grain | Paling hidup/atmosferik, tapi animasi berjalan terus (biaya GPU/baterai nyata di HP) dan memunculkan dua warna di luar palet (violet & hijau) |
| C. Blueprint + Aurora | Grid **dan** gumpalan mengalir + grain | Paling berkarakter, tapi paling ramai — berisiko mengganggu bacaan saat dipakai harian |
| D. Kedalaman tenang | Hanya pendaran berlapis (atas/samping/bawah) + vignette + grain, tanpa pola | Paling minim risiko, tapi paling kecil perubahan karakternya (hampir sekadar memperbanyak pendaran lama) |

**Konsekuensi teknis:**
- Murni CSS di `App.css` — **tanpa elemen DOM baru, tanpa berkas gambar, tanpa dependensi**
  (aman untuk PWA offline). `.app-bg` tidak lagi memasang `background-image` sendiri
  (kini hanya `background-color`); seluruh dekorasi pindah ke pseudo-elemennya:
  `::before` = vignette + pendaran atas/kiri + pendaran atas/kanan + pendaran bawah +
  2 garis grid (6 lapis `background-image`), `::after` = grain.
- Semua lapisan: `position: fixed` + `inset: 0` + `z-index: -1` + `pointer-events: none`.
  `fixed` dipakai agar pendaran & grid "diam" saat digulir — perilaku yang sama dengan
  `background-attachment: fixed` milik versi lama — sekaligus menghindari repaint
  berulang saat menggulir di HP.
- **`isolation: isolate` pada `.app-bg` itu WAJIB**: tanpanya `z-index: -1` akan jatuh
  **di belakang** warna kanvas dan seluruh lapisan tak terlihat. Dibuktikan tidak
  mengubah tata letak (scrollWidth identik sebelum/sesudah) dan tidak memutus
  `backdrop-filter` header/bilah (kaca masih menembus lapisan latar).
- Token baru (kedua tema): `--app-glow-3` (pendaran bawah), `--app-vig` (warna vignette),
  `--grain-op` (opasitas grain), `--grain-mix` (`overlay` di gelap, `multiply` di terang).
- Grain = SVG `feTurbulence` inline (±300 byte) di dalam `url("data:image/svg+xml,…")` —
  bukan berkas gambar, jadi tidak menambah bundel maupun permintaan jaringan.
- **Intensitas bisa disetel satu angka per efek** tanpa menyentuh struktur:
  `--grid-line` (kekuatan grid), `--app-glow-1/2/3` (pendaran), `--app-vig` (vignette),
  `--grain-op` (grain). Nilai terang sengaja jauh lebih tipis daripada gelap.
- **Bukti (DOM/computed style):** pada viewport 320px (clientWidth 310) `scrollWidth = 310`
  → **nol luber**; **0** target sentuh <44px; `::before` = 6 gradien + grid `28px 28px`,
  `position: fixed`, `z-index: -1`, `pointer-events: none`; `::after` grain (0,04 gelap /
  0,05 terang, `overlay`/`multiply`); **0 error konsol**; struktur lapisan identik di
  kedua tema. Mematikan kedua lapisan → `scrollWidth` tetap sama (lapisan menyumbang 0px
  luber); melepas `isolation` → `scrollWidth` tetap sama.

---

## D19 — Titik Masuk "Pasang App" = Satu Popup 5 Detik (bukan tombol permanen)

**Tanggal:** 13 Oktober 2026

App punya **tiga** titik masuk pemasangan PWA, dan ketiganya bermasalah:

1. Tombol **"Pasang"** di header — selalu tampil tanpa menunggu app benar-benar bisa
   dipasang, jadi sering **tidak bereaksi** (`window.installApp()` keluar lebih awal
   saat `deferredPrompt` kosong). Ia juga **penyebab luber horizontal 1024–1109px**
   yang selama ini tercatat sebagai Known Issue.
2. Tile **"Pasang App"** di Aksi Cepat Dashboard — masalah reaksi sama, plus menempati
   1 dari 4 kolom grid.
3. **Banner** `#install-prompt` di `index.html` — muncul saat `beforeinstallprompt`,
   tapi **tidak pernah hilang sendiri** (menetap sampai ditekan), dan tombol "Nanti"-nya
   menyimpan penolakan **permanen** di `localStorage` — sekali ditolak, tawaran tidak
   pernah datang lagi.

Kakang memutuskan: **buang dua tombol permanen**, ganti dengan **satu popup kecil**
yang muncul beberapa detik lalu hilang sendiri.

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Popup 5 detik tiap app dibuka (dipilih)** | Muncul saat browser menyatakan app bisa dipasang, **hilang sendiri setelah 5 detik**, **muncul lagi setiap browser di-refresh**, dan **berhenti permanen setelah app terpasang**. Tombol tutup hanya menyembunyikan (tanpa catatan penolakan). | Sesuai permintaan Kakang apa adanya. Karena tombol permanen dihapus, ini satu-satunya jalan pasang dari dalam app — jadi tawaran perlu datang lagi di kunjungan berikutnya, tapi tidak boleh mengganggu: 5 detik lalu pergi sendiri tanpa perlu ditekan. Tanpa `localStorage` → tidak ada state tersembunyi yang bisa basi |
| B. Sekali saja selamanya | Setelah auto-hilang pun dicatat, tidak pernah muncul lagi | Paling tenang, tapi yang kebetulan melewatkannya (atau belum siap memasang) kehilangan cara pasang dari dalam app; hanya lewat menu browser |
| C. Muncul tiap kali sampai dipasang / ditekan "Nanti" | Selalu tampil sampai ada tindakan | Paling mendorong pemasangan, tapi untuk app yang dipakai harian terasa mengganggu — dan tidak sesuai permintaan "hilang sendiri" |

**Konsekuensi teknis:**
- Tombol "Pasang" di header **dihapus** (`components/Navigation.jsx`). Ini sekaligus
  **menutup luber 1024–1109px**: klaster kanan berkurang 113px + 8px jarak (>95px luber
  terburuk). Import `CTA_CLASS` di berkas itu ikut dibersihkan (jadi tak terpakai).
- Tile "Pasang App" diganti pintasan **"Keluarga"** (`onNavigate('family')`, ikon `users`,
  nada `emerald`) → grid `grid-cols-4` tetap seimbang **dan** Aksi Cepat kini menutup
  keempat modul data (Pengeluaran · Agenda · Catatan · Keluarga), sejalan dengan 3 tile
  lain yang juga pintasan section.
- Banner bilah-penuh di `index.html` diubah jadi **kartu kecil**: `max-w-sm` di ponsel,
  `max-w-md` di `sm`+. Tata letak **bertumpuk** di bawah 640px (ikon + 2 baris teks, lalu
  tombol "Pasang" selebar kartu + tombol tutup 44px) dan **satu baris** di 640px ke atas —
  bentuk satu baris terbukti memepetkan teks jadi 48px di 320px (judul terpotong jadi
  "Pasang…"), jadi tumpukan itu keharusan, bukan pilihan gaya.
- Posisi: **tepat di atas tab bar** di ponsel
  (`bottom-[calc(3.5rem_+_env(safe-area-inset-bottom)_+_0.75rem)]`), **pojok kanan bawah**
  di `lg` (`lg:right-6 lg:bottom-6`). `z-[60]` → di atas header/tab bar (`z-40`),
  di bawah modal (`z-70/80`) dan gerbang (`z-90`).
- **Berhenti permanen setelah terpasang**: `matchMedia('(display-mode: standalone)')` &
  `navigator.standalone` diperiksa sebelum menampilkan, dan event `appinstalled` ikut
  menyembunyikan. **Tidak ada `localStorage`** — kunci lama `skipInstallPrompt` tidak
  dibaca lagi (dan tidak ditulis lagi).
- **Tampilnya menunggu pengguna lewat gerbang**: popup ada di `z-[60]`, gerbang `z-[90]`,
  jadi popup yang muncul saat gerbang terbuka **tak akan terlihat** (5 detiknya terbuang).
  `App.jsx` kini mengirim `window.dispatchEvent(new Event('bm:entered'))` saat pengguna
  masuk; `index.html` menunggu sinyal itu. Hanya sinyal **pertama** dihitung, supaya
  "Ganti pengguna" (gerbang muncul lagi) tidak memunculkan popup kedua kali.
- Transisi dipicu **reflow paksa** (`void card.offsetWidth`), bukan
  `requestAnimationFrame` — rAF tidak dipanggil saat tab disembunyikan, sehingga
  opasitas bisa tertinggal di 0 (terbukti saat verifikasi; nilai akhir jadi tak terukur).
- `installApp()` dibuat defensif (`typeof deferredPrompt.prompt !== 'function'` → keluar)
  supaya event tiruan/aneh tidak melempar error.

**Bukti (DOM/computed style):**
- **Luber horizontal 0** di 320 / 390 / 1024 / 1056 / 1090 / **1109** / 1120 / 1152 / 1280
  (sebelumnya 1024–1109 luber sampai 95px, `scrollWidth` mentok 1109). Keabsahan uji
  dipastikan: pada iframe 1024 `innerWidth = 1024` &
  `matchMedia('(min-width: 1024px)').matches = true` → tata letak desktop `lg` benar-benar aktif.
- Aksi Cepat = **4 tile** (Pengeluaran · Agenda · Catatan · Keluarga), 62×83px (320px)
  sampai 80×83px (390px); klik "Keluarga" → judul section "Semua Keluarga".
- Popup: **ditahan** saat masih di gerbang (`display: none`) → **tampil** setelah masuk
  (`display: flex`, `opacity: 1`, `transform: translateY(0)`) → **hilang sendiri** pada
  ~5 detik (`display: none`) → **tidak tampil** saat mode standalone (`display: none`).
- Geometri: 320–480px → kartu 278–384×112, **judul & subjudul tidak terpotong**, tepat di
  atas tab bar (jarak 11px pada 390px; tab bar `z-40` vs popup `z-60`); ≥640px → kartu
  448×66 satu baris, pojok kanan bawah (24px dari tepi). Semua tombol ≥44px
  (Pasang 99–310×44, tutup 44×44). **0 luber**, **0 error konsol** di semua lebar.
- Build produksi hijau; kelas baru (`flex-col`, `sm:flex-row`, `sm:max-w-md`,
  `sm:flex-none`, `lg:justify-end`) ikut ter-generate ke CSS hasil build.

**Catatan jujur:** pada sesi verifikasi ini `document.visibilityState` = `hidden`, sehingga
**transisi CSS tidak berjalan** (nilai terukur nyangkut di titik awal: `opacity: 0`,
`transform: translateY(8px)`). Karena itu keadaan akhir diukur dengan transisi
dimatikan lebih dulu (`card.style.transition = 'none'`) — nilainya benar, tetapi
**gerak animasi 200ms-nya belum pernah dilihat mata**. Kakang perlu memastikan sendiri
di HP/browser nyata bahwa popup muncul-hilang dengan lembut.

---

## D20 — Foto Profil Contoh (Seed) Disajikan dari `public/avatars/`

**Tanggal:** 13 Oktober 2026

Kakang ingin **foto profilnya terpasang** (`assets/profile-rezki.jpg`) supaya tampilan
"Akun saya" dan avatar terlihat nyata — bukan sekadar inisial "RY".

Masalahnya pola proyek: **`assets/` = berkas sumber asli** (tidak disalin ke `dist/`),
sedangkan **`public/` = aset yang benar-benar disajikan app** (Vite hanya menyalin `public/`).
Contoh yang sudah ada: `assets/logo.png` (sumber) → `public/brand/logo.png` (yang dipakai).
Kalau seed menunjuk langsung ke `assets/`, foto **tampil di dev tapi 404 di produksi/HP**.

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Salin ke `public/avatars/` (dipilih)** | Foto asli tetap di `assets/`; versi 256px disajikan app di `public/avatars/profile-rezki.jpg`; seed avatar = `/avatars/profile-rezki.jpg` (path stabil) | Mengikuti pola logo; **tampil di dev & produksi**; URL stabil → tidak rusak saat rebuild. Konsekuensi: dua berkas (sumber + tersaji) |
| B. Pindahkan saja (tanpa duplikat) | Hapus `assets/profile-rezki.jpg`, hanya ada versi `public/` | Repo lebih ramping, tapi berkas sumber Kakang hilang dari `assets/` |
| C. Import dari `assets/` di JS | `import avatar from './assets/profile-rezki.jpg'` (Vite membundel + memberi hash) | Satu sumber, tapi URL ber-hash → begitu snapshot tersimpan ke `localStorage` lalu app di-rebuild, avatar bisa **404 sampai "Muat ulang data contoh"** |

Kakang memilih **A**, dan memilih foto ini tampil **di akun _dan_ kartu anggota Keluarga**.

**Konsekuensi teknis:**
- `public/avatars/profile-rezki.jpg` = **256×256, ± 10 kB** (crop tengah, JPEG q82) — dibuat
  sekali dengan `System.Drawing`. Ini **bukan** bagian `npm run icons` (tanpa langkah build baru).
  `assets/profile-rezki.jpg` (500×500, 120 kB) tetap jadi sumber.
- Seed avatar (`/avatars/profile-rezki.jpg`) dipasang di **`users[0]`** (`id: 'kakang'`) dan
  **`family[0]`** (anggota "Rezki YT"). Tiga pengguna/kartu lain tetap inisial.
- `FamilyMemberCard` kini memakai komponen bersama **`Avatar`** (foto bila `member.avatar` ada,
  kalau tidak inisial) — sebelumnya inisial di-hardcode, jadi kartu Keluarga tak bisa berfoto.
  Kotak avatar tetap **56px (HP) / 64px (`sm`+)** — ukuran tidak berubah, hanya isinya.
- **Snapshot lama tetap dapat foto:** `loadInitialData` melengkapi field `avatar` dari seed untuk
  user dengan `id` yang cocok, **tanpa menimpa** avatar yang sudah diganti/dihapus
  (`avatar: ''` dipertahankan) — pola sama seperti migrasi modul `family` (D17).
- Service worker: `/avatars/profile-rezki.jpg` ditambahkan ke precache + versi cache
  dinaikkan `v8` → **`v9`** (agar app-shell lama, termasuk `index.html`, tidak menyajikan versi basi).

**Bukti (DOM/computed style):**
- Chip header (`#account-trigger`) & kartu gerbang: `<img src="/avatars/profile-rezki.jpg">`
  `naturalWidth 256`, `object-fit: cover`, chip 32×32 / gerbang 40×40; inisial "RY" **tidak** lagi tampil.
- Kartu Keluarga "Rezki YT": foto 62×62 (800px) dan **56×56 di 320px** (`border-radius: 16px`);
  Hilda/RAGASUCI/RAJABRANA tetap inisial "HA"/"RS"/"RB" pada kotak berukuran sama.
- Modal "Akun saya": pratinjau foto termuat; tombol berubah jadi **"Ganti foto" + "Hapus foto"**;
  uji "Hapus foto" → pratinjau balik ke inisial "RY" + tombol kembali "Pilih foto" (Batal tidak menyimpan).
- **0 luber** (lebar 800px & iframe 320px) dan **0 error konsol**; `npm run build` hijau,
  `dist/avatars/profile-rezki.jpg` (10.406 byte) ikut tersalin & path-nya ada di bundle.

---

## D21 — Angka Pengeluaran Contoh Disamakan (Hero = Donat = Tren) jadi Rp 6,3 jt & Anggaran Naik

**Tanggal:** 13 Oktober 2026

Kakang minta **total pengeluaran contoh jadi Rp 6,3 jt**. Saat memeriksa, ditemukan
**ketidakcocokan data** yang sudah ada sejak lama: "total pengeluaran" muncul sebagai
turunan di **tiga** tempat dan nilainya tidak sama — kartu hero (jumlah 10 item
`expenses`) = **Rp 4,71 jt**, sedangkan tengah donat (jumlah `categories`) dan tren bulan
berjalan (Okt di `monthlyTrend`) = **Rp 2,78 jt**.

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Samakan semua ke 6,3 jt (dipilih)** | Ubah item `expenses` agar berjumlah 6,3 jt, `categories` jadi 6,3 jt, `monthlyTrend` Okt = 6,3 jt | Menutup ketidakcocokan sekaligus; hero, donat, dan tren bercerita sama |
| B. Hanya donat | `categories` saja yang jadi 6,3 jt | Hero tetap 4,71 jt & tren 2,78 jt → makin tidak sinkron |
| C. Hanya hero | Item `expenses` saja yang jadi 6,3 jt | Donat & tren tetap 2,78 jt → tetap tidak sinkron |

Kakang memilih **A**, dan memilih **anggaran naik ke Rp 8 jt** (kalau dibiarkan 4,5 jt,
6,3 jt melewati anggaran → realisasi mentok 100% + sisa Rp 0 + notifikasi "anggaran terlewati").

**Konsekuensi teknis:**
- Donat harus memuat **6 kategori** (bukan 4): dengan 4 kategori nilai alaminya hanya
  **5,3 jt**, jadi totalnya tak bisa 6,3 jt tanpa angka karangan. Enam kategori =
  jumlah per-kategori `expenses` yang sesungguhnya (belanja 2,2 jt / pendidikan 1,45 jt /
  utilitas 1,0 jt / ibadah & sosial 750 rb / transportasi 650 rb / kesehatan 250 rb).
- Token warna baru **`--chart6`** di `App.css` (gelap `244 63 94`, terang `190 18 60`) +
  padanannya di `tailwind.config.js` (paritas; donat tetap memakai inline `style`).
- Anggaran `budget.total` = **Rp 8 jt** ⇒ realisasi **79%**, sisa **Rp 1,7 jt** — sengaja di
  bawah ambang peringatan **80%** di `notifications.js` supaya contoh tak memunculkan
  "anggaran hampir terlewati".
- **Invarian baru:** hero = donat = tren Okt harus selalu sama. Dicatat di `AGENT.md`
  supaya suntingan data contoh berikutnya tidak memecahkannya lagi.

**Bukti (DOM):** hero `Rp 6.300.000` (74% vs bulan lalu), realisasi **79%** + "Sisa dari
Rp 8 jt" = `Rp 1.700.000`; donat tengah `Rp 6,3 jt` dengan **6 baris legenda** berjumlah
100% (35/23/16/12/10/4%) dan **7 lingkaran svg** (1 alur + 6 busur); tren Okt `Rp 6,3 jt`
(rata-rata `Rp 3,7 jt`); header Keuangan "Total: Rp 6.300.000 · anggaran Rp 8 jt";
tombol mata tetap mengubah **tepat 3** dari **24** simpul "Rp" (hanya kartu hero);
**0 luber**, **0 error konsol**; `npm run build` hijau.

---

## D22 — Card "7 Hari Terakhir" Dihapus dari Dashboard

**Tanggal:** 14 Oktober 2026

Kakang meminta **menghapus card "7 Hari Terakhir" hanya di Dashboard**. Data dummy
`weekly` tetap ada di `App.jsx` (siap pakai kembali), dan komponen `BarChart` di
`charts.jsx` juga tidak dihapus — hanya **importnya** yang ditirihkan dari
`components/Dashboard.jsx` (sudah tidak dipakai).

**Konsekuensi tampilan & layout:**
- Dashboard sekarang **dua chart**: tren 6 bulan (full width) → donut "Komposisi"
  (full width). Sebelumnya donut berdempetan dengan bar chart di
  `lg:grid-cols-2`; kini donut memakan lebar penuh di atas 640px. Nilainya tidak berubah.
- Nilai apa pun tidak berubah: hero tetap `Rp 6.300.000`, donut tetap `Rp 6,3 jt`
  (6 irisan, 100%), tren Okt `Rp 6,3 jt`.

**Bukti (DOM):** hanya **2** `figure` tersisa di `#main` (tren + donut),
"7 Hari Terakhir" tidak ada (`hasBarTitle` = false); **0 luber**, **0 error konsol**;
`npm run build` hijau.

---

## D23 — Timeline (Alur Aktivitas) Ditambahkan ke Dashboard

**Tanggal:** 14 Oktober 2026

Kakang minta **timeline alur aktivitas ikut tampil di Dashboard**, bukan hanya di halaman
Agenda → sub-tab Timeline. Komponen `Timeline.jsx` yang sudah ada dipakai ulang (tidak ada
komponen baru) di dalam Panel "Timeline Agenda", setelah panel donat.

**Konsekuensi teknis:**
- `Timeline` harus menerima **objek `data` utuh** (`data={data}`), bukan `data.schedule`.
  Komponennya membaca `data.schedule/tasks/expenses/notes`; mengirim array membuat semua
  hitungan 0 sehingga kartu menampilkan "Belum ada aktivitas". Halaman Agenda memang sudah
  benar (`data={data}`), makanya isinya lengkap.
- Tiga contoh agenda baru (id 14–16) ditambahkan agar alurnya berisi: "Membaca Al-Quran
  malam" (ibadah), "Menghadiri undangan keluarga" (keluarga), "Belanja bulanan keluarga"
  (rumahtangga). Dua di antaranya sempat memakai kategori tak sah (`agenda`, `belanja`)
  sehingga labelnya tampil teks mentah — sudah diganti ke kategori yang ada di
  `AGENDA_CATEGORIES`.

> **Jebakan dev server (penting untuk sesi berikutnya):** setelah kode diperbaiki
> (`data={data}`, commit `cc0c65d`), kartu **tetap** kosong karena dev server Vite di
> port 3000 menyajikan **transform BASI** khusus file `Dashboard.jsx`
> (`jsxDEV(Timeline, { data: data.schedule … })`) — `App.jsx` & `Timeline.jsx` tersaji segar,
> hanya satu file itu yang watcher-nya melewatkan event `change`. Solusinya: sentuh
> (perbarui mtime) file itu agar Vite mentransformasi ulang. **Kalau UI tidak mengikuti
> perubahan kode, cek dulu modul yang benar-benar disajikan server** (`fetch('/components/X.jsx')`)
> sebelum mencurigai logika komponen.

---

## D24 — Timeline di Dashboard Dibuat Ringkas (Preview 3 Hari + "Lihat semua")

**Tanggal:** 14 Oktober 2026

Setelah D23, kartu "Timeline Agenda" memuat **seluruh alur** (42 item: 16 agenda + 8 tugas +
10 pengeluaran + 8 catatan, plus blok "Riwayat") — terlampau panjang untuk sebuah Dashboard
(terukur **4008px**). Prinsip yang dipakai: **Dashboard = permukaan ringkasan**, jadi memakai
*progressive disclosure* — cuplikan ringkas + jalan "lihat semua".

Catatan jujur: dataset panduan UI/UX internal proyek ini **tidak memuat aturan khusus**
"kartu dashboard kepanjangan"; yang terverifikasi & relevan hanya *"truncate with expand
option"* dan hindari **scroll bersarang** — karena itu opsi scroll-dalam-kartu tidak dipilih.

| Opsi | Bentuk | Alasan/Konsekuensi |
|---|---|---|
| **A. Preview + "Lihat semua" (dipilih)** | Kartu hanya memuat hari ini + 2 hari berikutnya; blok "Riwayat" & chip filter disembunyikan; tombol "Lihat semua" membuka Agenda → sub-tab Timeline. Kartu "Agenda Terdekat" **dilepas** karena tumpang tindih | Tinggi terbatas, tanpa scroll bersarang, tidak ada dua daftar agenda |
| B. Preview, "Agenda Terdekat" tetap | Sama seperti A, tapi dua daftar agenda dibiarkan | Masih tumpang tindih |
| C. Batas tinggi + scroll dalam kartu | `max-h` + `overflow-y-auto` | Scroll bersarang menyulitkan di layar sentuh & isi jadi tersembunyi |
| D. Hapus kartu dari Dashboard | Timeline hanya di halaman Agenda | Kehilangan tampilan timeline di halaman depan |

**Konsekuensi teknis:**
- `components/Timeline.jsx` dapat **tiga prop opsional**: `limitDays` (batasi jumlah hari ke
  depan), `showHistory` (default `true`), `showFilters` (default `true`). Nilai default =
  tampilan penuh → pemakaian di halaman Agenda tidak berubah sama sekali.
- `components/Dashboard.jsx` memakai `limitDays={3} showHistory={false} showFilters={false}`;
  aksi header Panel diubah dari label "filter" menjadi tombol **"Lihat semua"** (≥44px).
- `App.jsx` menambah `handleOpenAgendaTimeline()` (`setAgendaMode('timeline')` +
  `setActiveSection('agenda')`) yang dikirim sebagai prop `onOpenTimeline`.
- Panel "Agenda Terdekat" dilepas; "Pengeluaran Terbaru" kini full-width (pembungkus
  `lg:grid-cols-2` dihapus). Tidak ada nilai uang yang berubah.

**Bukti (DOM):** kartu preview tinggi **873px** vs alur penuh **4008px** (≈78% lebih pendek);
preview memuat **3 kelompok hari** (Hari Ini, Besok, +1), **tanpa** "Riwayat — sebelum hari
ini", **tanpa** chip filter, ada tombol "Lihat semua"; "Agenda Terdekat" tidak ada,
"Pengeluaran Terbaru" tetap ada; klik "Lihat semua" mendarat tepat di Agenda → sub-tab
Timeline ("Timeline Keluarga", alur penuh 25 kelompok hari / 67 item + chip filter kembali);
**0 luber**, **0 error konsol**; `npm run build` hijau.

**Pembaruan (sesi yang sama):** atas permintaan Kakang, kartu **"Pengeluaran Terbaru"
dipindah ke ATAS kartu "Timeline Agenda"**. Urutan akhir Dashboard: sapaan → hero →
aksi cepat → KPI → tren → komposisi → **Pengeluaran Terbaru** → **Timeline Agenda**.
Efeknya: seluruh blok uang (hero, KPI, tren, komposisi, pengeluaran) berkumpul di atas,
dan kartu terpanjang (Timeline) menjadi penutup. Bukti DOM: judul "Pengeluaran Terbaru"
di `y≈1513`, "Timeline Agenda" di `y≈1889`.

---

## D25 — Tetap PWA Selama Pengembangan; Capacitor Direncanakan Setelah Selesai

**Tanggal:** 14 Oktober 2026

Kakang bertanya apakah sebaiknya memakai **WebView** alih-alih PWA. Setelah ditelusuri,
pertanyaannya bukan "PWA vs WebView" — keduanya **bukan** alternatif: PWA adalah *isinya*,
WebView adalah *kotak pembungkusnya*. Kode React-nya tetap sama persis; yang berubah hanya
cara mengantar ke perangkat + kemampuan native yang bisa dipanggil.

Empat fakta proyek ini yang membuat PWA tetap unggul **selama pengembangan**:

| Fakta proyek | Kenapa penting |
|---|---|
| Penggunanya **2 orang** (Kakang + Istri) | Tidak butuh Play Store/App Store; manfaat "app asli" (ditemukan orang banyak) = nol |
| Notifikasi sudah lewat **WhatsApp/Fonnte (D15)** | Kelemahan nomor 1 PWA (web push lemah, terbatas di iOS) sudah tertutup rencana lain — pengiriman dilakukan server → WA grup |
| Data akan pindah ke **Worker + D1** | Risiko khas PWA (penyimpanan browser bisa dibersihkan OS) hilang karena `localStorage` tinggal jadi cache |
| Masih **PROTOTYPE & cepat berubah** | PWA: deploy sekali → HP langsung dapat versi baru. Capacitor/WebView: tiap perubahan harus rebuild (→ re-sign) → install ulang |

**Keputusan:** selama pengembangan inti (sampai backend Worker + D1 jalan & fitur stabil)
**tetap PWA** — PWA adalah kanal utama. **Capacitor** dikerjakan **setelah pengembangan
selesai** sebagai kanal **tambahan** (Android/iOS), **bukan pengganti**.

Alasan memilih **Capacitor** dan bukan WebView buatan sendiri: mesin render & storage resmi
mengikuti WebView sistem, ada plugin resmi untuk kebutuhan native, dan proyek tetap **satu
basis kode** (tanpa menulis ulang apa pun).

**Catatan teknis untuk dikerjakan nanti (BELUM dikerjakan):**
- Paket: `@capacitor/core` + `@capacitor/cli` + `@capacitor/android` (`@capacitor/ios` bila perlu);
  `capacitor.config` → `webDir: 'dist'` (sama seperti build Cloudflare Pages).
- Dua mode muat aset: **bundled** (aset `dist/` ikut masuk app → jalan tanpa internet, tapi tiap
  update frontend perlu rilis ulang) atau **`server.url`** (WebView memuat domain → selalu versi
  terbaru, tapi butuh internet saat membuka). Trade-off ini **diputuskan saat itu**, bukan sekarang.
- **Storage:** `localStorage` di dalam app **berbeda** dari `localStorage` di Chrome — snapshot lama
  tidak ikut dan bisa terhapus saat app di-uninstall/clear data. Aman karena D1 akan jadi sumber
  kebenaran; kalau ingin data lokal lebih kuat → `@capacitor/preferences`.
- **Popup "Pasang app" (D19) tidak relevan** di dalam app: `beforeinstallprompt` tidak pernah muncul
  di WebView → deteksi & popup-nya dimatikan/disesuaikan saat itu.
- **iOS tetap butuh macOS + Xcode + akun Apple Developer (US$99/th).** Kalau Istri memakai iPhone,
  alat & biaya ini perlu disiapkan **lebih awal**, bukan mendadak.
- Notifikasi **tidak berubah** (tetap WA/Fonnte). Kalau nanti mau alarm lokal native →
  `@capacitor/local-notifications`; itu keputusan baru, bukan kebutuhan sekarang.

**Konsekuensi SEKARANG: nol perubahan kode.** Tidak ada dependensi Capacitor yang ditambah, tidak
ada `fetch` baru (aturan proyek tetap: jangan asumsikan API/DB ada). Satu hal murah yang berguna
dilakukan lebih awal: saat backend dibuat, taruh **base URL API di satu konstanta** (jangan disebar)
supaya nanti mudah diarahkan dari Capacitor.

---

## D26 — Modul Anggaran (Budgeting 50/30/20): Sub-tab di Keuangan, Alokasi + Realisasi

**Tanggal:** 14 Oktober 2026
**Spec lengkap:** `docs/superpowers/specs/2026-10-14-anggaran-budgeting-design.md`
**Status:** ✅ **SUDAH dikerjakan** (14 Okt 2026) — commit `3bcd386` (keranjang di `categories.js`), `92c6206` (`components/budget.js`), `5d0ad91` (data contoh + donat 9 irisan + pembaca lewat `getBudget` + halaman Anggaran pertama), `e88058c` (editor gaji/rasio ber-validasi), `90ff1da` (pos bisa tambah/ubah/hapus/pindah keranjang), `95e375f` (field **Keranjang** di form pengeluaran). Dokumen (`AGENT.md`, `DESIGN-SYSTEM.md`, `README.md`) disinkronkan menyusul.

Kakang minta halaman untuk mengatur **budgeting**: setiap gajian diinput gaji, lalu otomatis
dibagi menurut rumus **50/30/20** (Kebutuhan · Keinginan · Tabungan & Utang) beserta pos-posnya
(cicilan/sewa, bahan makanan, utilitas, transportasi, sekolah & asuransi; makan di luar, hobi,
streaming, liburan; dana darurat, tabungan, investasi, utang).

Delapan keputusan yang diambil (semua lewat pilihan A/B/C, rinciannya di spec):

| # | Pertanyaan | Dipilih | Alasan singkat |
|---|---|---|---|
| 1 | Letak modul | **Sub-tab di section Keuangan** (`Pengeluaran` & `Anggaran`) | Menjaga 5 section (DESIGN-SYSTEM §6), tidak menyentuh bottom-nav HP, anggaran duduk sebelah data pengeluarannya |
| 2 | Kedalaman | **Alokasi + realisasi** | Realisasi dihitung dari pengeluaran nyata → kelihatan keranjang mana yang bocor (inti manfaat 50/30/20) |
| 3 | Penghubung ke keranjang | **Field `bucket` per pengeluaran** + 3 kategori baru | Kategori sekarang belum punya rumah untuk Keinginan & Tabungan; koreksi manual per transaksi penting (mis. zakat/infak, "cicilan" yang muncul di dua keranjang) |
| 4 | Rasio | **Bisa disunting**, default 50/30/20 | Ubah ke 60/20/20 nanti tidak perlu ubah kode |
| 5 | Pos dalam keranjang | **Saran yang bisa disesuaikan** — label saja, tanpa centang & tanpa nominal | Daftar Kakang tetap jadi pengingat, tapi bisa menyesuaikan pos nyata keluarga |
| 6 | Pendekatan data | **Satu bulan aktif, semua angka turunan** | Mengikuti cara app bekerja (hero/donat/tren memang satu periode) & mencegah muncul angka anggaran kedua (pelajaran D21) |
| 7 | Cicilan rumah | **Kategori `Rumah & Cicilan`** | Cicilan/sewa tempat tinggal = kebutuhan pokok, beda dari "utang" di keranjang 20% |
| 8 | Editor gaji & rasio | **Editor kecil di halaman Anggaran** | Validasi "jumlah = 100" tanpa menyentuh `FormSheet` yang dipakai 4 section |

**Konsekuensi teknis:**
- `budget` → `{ month, income, ratios, pos }`; `bucketOf(item)` = field `bucket` → peta kategori → `needs`.
- Kategori keuangan +3: `rumah` (Rumah & Cicilan), `hiburan` (Hiburan & Liburan), `tabungan` (Tabungan & Utang).
- **Donat jadi 9 irisan** → 3 token warna baru (`--chart7/8/9`, tema gelap & terang).
- Data contoh: **gaji Rp 8 jt** (angka lama dipertahankan), pengeluaran jadi **11 item**. Awalnya total **Rp 6,3 jt** (hero "79% · sisa Rp 1,7 jt"); **diubah 15 Okt 2026** — "Sewa & cicilan rumah" dinaikkan ke **Rp 5,5 jt** → total **Rp 10,65 jt** (expenses + donat + tren Okt diupdate bersamaan), hero **133%** (status "terlewati"), sisa **−Rp 2,65 jt**.
- Snapshot `localStorage` lama tidak bikin rusak: `income` (fallback `total`), `ratios`, `pos`, dan `bucket` semuanya punya nilai cadangan di satu helper `getBudget(data)`.
- Riwayat bulanan **ditunda** sampai backend Worker + D1 (bulan = baris tabel).

**Hasil verifikasi (DOM, 15 Okt 2026):** hero **133%** (status "terlewati") + sisa **−Rp 2,65 jt**; donat 9 legenda = **Rp 10,65 jt** = jumlah 11 kartu Keuangan (3 angka D21 tetap cocok); Anggaran menampilkan realisasi **7.950.000 / 1.800.000 / 900.000** vs alokasi **4.000.000 / 2.400.000 / 1.600.000** (status Lebih / Aman / Aman, sisa −3,95 jt / 600 rb / 700 rb), pos 6 / 4 / 4; rasio tidak berjumlah 100% **ditolak** ("Jumlah rasio harus 100% (sekarang 110%)", editor tetap terbuka, tidak ada yang disimpan); rasio 60/20/20 tersimpan dan bertahan setelah reload; pemasukan 0 → alokasi Rp 0 (tanpa NaN); ubah keranjang sebuah pengeluaran **memindahkan** realisasinya; pengeluaran lama tanpa `bucket` → form menampilkan "Otomatis"; snapshot lama bergaya `budget.total` tetap terbaca; 0 luber horizontal, 0 error konsol.

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
| 13 Okt 2026 | D17 | Modul "Keluarga" = papan profil anggota (kategori: anggota/medis/kontak/dokumen) | Tab Keluarga belum pernah didefinisikan; isinya menduplikasi Agenda & Keuangan |
| 13 Okt 2026 | D18 | Latar = "blueprint teknik": grid 28px seluruh kanvas + pendaran atas & bawah + vignette + grain (statis, murni CSS) | Kanvas terasa plain — pendaran lama berhenti di bagian atas & latar tidak berlapis sehingga kartu kaca ikut datar |
| 13 Okt 2026 | D19 | Titik masuk "Pasang app" = satu popup 5 detik tiap app dibuka; tombol "Pasang" di header & tile "Pasang App" dihapus (tile jadi pintasan Keluarga) | Tombol Pasang selalu tampil walau app belum bisa dipasang (sering tak bereaksi) & jadi penyebab luber header 1024–1109px; banner lama tak pernah hilang sendiri |
| 13 Okt 2026 | D20 | Foto profil contoh disajikan dari `public/avatars/profile-rezki.jpg` (bukan `assets/`) & dipakai sebagai seed avatar Kakang **dan** kartu anggota "Rezki YT"; `FamilyMemberCard` pakai `Avatar` | Kakang minta foto profilnya terpasang agar tampilan "Akun saya" & avatar terlihat nyata; `assets/` tidak ikut ke `dist/` sehingga foto akan 404 di produksi |
| 13 Okt 2026 | D21 | Angka pengeluaran contoh disamakan jadi **Rp 6,3 jt** di hero, donat (kini 6 kategori + token `--chart6`), & tren Okt; anggaran contoh naik ke **Rp 8 jt** | Kakang minta total 6,3 jt; sekaligus ditemukan hero (4,71 jt) ≠ donat/tren (2,78 jt) — data dummy tidak sinkron |
| 14 Okt 2026 | D22 | Hapus card "7 Hari Terakhir" di Dashboard; donut "Komposisi" jadi full-width di atas 640px | Kakang: "bisa kamu hapus card 7 Hari Terakhir?" — hanya di Dashboard (data `weekly` & komponen BarChart tetap ada) |
| 14 Okt 2026 | D23 | Timeline (alur aktivitas) ditambahkan ke Dashboard sebagai Panel "Timeline Agenda" (komponen sama dengan halaman Agenda, wajib `data={data}` utuh) + 3 contoh agenda baru (id 14–16) | Kakang minta tampilan timeline ada di Dashboard; alurnya butuh agenda bertanggal |
| 14 Okt 2026 | D24 | Timeline di Dashboard dijadikan **ringkas** (preview 3 hari + "Lihat semua" → Agenda sub-tab Timeline); blok Riwayat & chip filter disembunyikan; kartu "Agenda Terdekat" dilepas | Kakang: kartu terasa terlalu panjang → dipilih progressive disclosure (opsi A), bukan scroll dalam kartu |
| 14 Okt 2026 | D24 (lanjutan) | Kartu "Pengeluaran Terbaru" dipindah ke **atas** kartu "Timeline Agenda" | Kakang: "pindahkan card Pengeluaran Terbaru menjadi di atasnya card Timeline Agenda" |
| 14 Okt 2026 | D25 | **Tetap PWA** selama pengembangan; **Capacitor** dikerjakan **setelah pengembangan selesai** sebagai kanal tambahan Android/iOS (bukan pengganti, bukan WebView buatan sendiri) | Kakang bertanya "PWA vs WebView?" → dipilih mencatat dulu tanpa mengubah kode; Capacitor menyusul pasca-pengembangan |
| 14 Okt 2026 | D26 | **Modul Anggaran** (50/30/20) jadi **sub-tab di Keuangan** (`Pengeluaran` & `Anggaran`): alokasi + realisasi, field `bucket` per pengeluaran + 3 kategori baru (`rumah`, `hiburan`, `tabungan`), rasio bisa disunting, pos bisa disesuaikan; satu bulan aktif dengan angka turunan | Kakang butuh halaman budgeting: input gaji → otomatis bagi 50/30/20 → lacak realisasi tiap keranjang |
| 15 Okt 2026 | D26 (lanjutan) | **"Sewa & cicilan rumah" dinaikkan ke Rp 5,5 jt** → total pengeluaran contoh jadi **Rp 10,65 jt** (expenses + donat + tren Okt diupdate bersamaan); hero 133% (terlewati), sisa −Rp 2,65 jt | Kakang minta ganti nilai; dipilih update ketiga sumber sekaligus agar invariant D21 (hero = donat = tren) utuh |