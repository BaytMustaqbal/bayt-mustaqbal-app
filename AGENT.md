# AGENT.md - Bayt Mustaqbal Project

## ⚠️ Status Proyek: FASE PROTOTYPE (PWA Statis)

Proyek ini **masih di tahap awal**: frontend PWA statis dengan **mock data**. Backend (Cloudflare Worker + D1) **belum dibangun**. Jangan asumsikan API, database, atau auth sudah ada.

**Project:** Bayt Mustaqbal (بَيْت الْمُسْتَقْبَل) = "Rumah Masa Depan"
**Pemilik:** Kakang (Rezki Yudi Triana)
**Target User:** Kakang + Istri (2 user)
**Visi:** Satu app untuk keuangan, absensi, kalender, service motor/rumah.

---

## Stack Aktual (Saat Ini)

- **Frontend:** React 18 (JSX, bukan TS) + Vite 4
- **Styling:** Tailwind CSS via **PostCSS** (`tailwind.config.js` + `postcss.config.js`) + `App.css` custom — design system **High-Tech Blue**: dark navy `#0A192F` + electric cyan `#22D3EE`, **latar berlapis "blueprint teknik"** (grid 28px seluruh kanvas + pendaran atas/bawah + vignette + grain, statis, murni CSS di pseudo-elemen `.app-bg` — lihat D18 & `DESIGN-SYSTEM.md` §4), glassmorphism terukur, glow tipis. **Dua tema: gelap (default) & terang** — nilai warna hanya di `App.css` (`:root` = gelap, `[data-theme='light']` = terang) sebagai kanal RGB; pilihan **Sistem/Terang/Gelap** di localStorage `bm-theme`. **Skala elevasi** (`e1`/`e2`/`pop`/`nav`), token durasi/easing (`duration-fast/base/slow`, `ease-smooth/crisp`), dan konstanta hover kartu (`CARD_INTERACTIVE`) ada di `tailwind.config.js` + `components/ui.jsx` (lihat `DESIGN-SYSTEM.md` §2 & §5 & §12)
- **Icons:** SVG inline custom (`components/Icon.jsx`, gaya Lucide) — Font Awesome **sudah dihapus**. **Logo/merek** = `assets/logo.png` (Kakang): dipakai sebagai mark di header + layar gerbang (`public/brand/logo.png`, transparan) dan sebagai **ikon PWA** (`public/icons/*`, latar navy) lewat `npm run icons`.
- **Font:** Plus Jakarta Sans (teks) + **Fira Code** (angka/KPI/label chart) — Google Fonts
- **PWA:** `public/manifest.json` + `public/service-worker.js` (cache-first, background sync) — SW diregistrasi **hanya di build production** (`main.jsx`). Aset statis **wajib** di `public/`, karena Vite hanya menyalin folder itu ke `dist/`
- **State:** React `useState`/`useEffect` (no Zustand/React Query)
- **Data:** **Dummy murni** di `App.jsx` (`const data = mockData`) — **belum ada panggilan API sama sekali**, atas permintaan Kakang
- **Deploy target (rencana):** Cloudflare Pages (frontend) + Cloudflare Worker + D1 (backend)

---

## Struktur Folder Aktual

```
bayt-mustaqbal-app/
├── index.html              # Entry PWA: Plus Jakarta Sans, manifest, popup "Pasang app" (D19), network monitor + skrip boot tema (anti-kedip) & meta theme-color/status-bar dinamis
├── main.jsx                # React entry: createRoot → render <App /> ke #root + registrasi SW (production)
├── App.jsx                 # Root: 5 section + layar gerbang (pilih pengguna) + data dummy (seed) + persist localStorage + bottom sheet Tambah/Ubah + modal Akun + toast (undo hapus) + banner offline + **state tema** (bm-theme, ikut sistem, toggle)
├── App.css                 # Tailwind (@tailwind base/components/utilities) + **design token DUA TEMA** (kanal RGB di :root & [data-theme='light']), **latar berlapis .app-bg::before/::after** (grid 28px + pendaran + vignette + grain, D18), efek/bayangan/kaca per tema, focus-visible, scrollbar, animasi
├── tailwind.config.js      # Theme tokens: warna (→ rgb(var(--x) / <alpha-value>)), nada tone*, member*, chart*, skala elevasi (e1/e2/pop/nav), durasi+easing gerak + content paths
├── postcss.config.js       # Plugin: tailwindcss + autoprefixer
├── vite.config.js          # Vite config: react plugin, port 3000
├── package.json            # Deps: react, react-dom, vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer
├── DESIGN-SYSTEM.md        # Design system: High-Tech Blue, tipografi, layout, komponen, PWA, a11y
├── components/
│   ├── Icon.jsx            # Set ikon SVG inline (home, calendar, wallet, users, tasks, note, pin, utensils, edit, trash, search, undo, barChart, target, chevron, lock, eye/eyeOff, camera, sun/moon/monitor (tema) dll.)
│   ├── ui.jsx              # Primitif UI: Card, GlassCard, SectionHeader, StatCard, ProgressBar,
│   │                       #   QuickAction, EmptyState, ExpenseCard, ItemActions, Badge, FamilyList, CTA_CLASS,
│   │                       #   Avatar (foto/inisial) + initialsOf(nama)
│   ├── Navigation.jsx      # Header sticky glass (merek + nav lg+ + tombol tema (sun/moon, 44px) + lonceng notifikasi + chip pengguna) + bottom tab bar 56px glass;
│   │                       #   tab Agenda, Keuangan, Keluarga & Catatan = dropdown filter (animasi, badge jumlah, a11y menu);
│   │                       #   lonceng = panel notifikasi turunan data (badge belum dibaca, "tandai semua dibaca");
│   │                       #   chip pengguna = pembuka modal "Akun saya"
│   ├── AccountModal.jsx    # Modal "Akun saya" (tengah layar): foto profil (kecilkan 256px di canvas), Nama, Username,
│   │                       #   Password (kolom profil, belum diverifikasi), bagian **Tampilan** (radio Sistem/Terang/Gelap), "Ganti pengguna"; role=dialog, error per-field
│   ├── notifications.js    # Notifikasi turunan data (tanpa backend): anggaran, tugas, agenda terdekat, pengeluaran besar → id stabil + target navigasi
│   ├── categories.js       # Kategori agenda, keuangan, keluarga, catatan + filter tugas & penghitung per item + meta ikon
│   │                       #   + keranjang anggaran (BUCKETS, CATEGORY_BUCKET, bucketOf, getBucketMeta) — sumber "Kebutuhan/Keinginan/Tabungan"
│   ├── budget.js           # Logika modul Anggaran **murni (tanpa React)**: getBudget (fallback snapshot lama `budget.total`),
│   │                       #   allocate (50/30/20), summarize (realisasi per keranjang), statusOf (Aman/Hati-hati/Lebih),
│   │                       #   ratiosValid (harus 100%), DEFAULT_RATIOS/DEFAULT_POS
│   ├── WelcomeGate.jsx     # Layar gerbang tiap app dibuka: logo besar + tagline (iman–teknologi–keluarga) + kartu pengguna (avatar foto/inisial + nama + @username/peran) + tombol "Muat ulang data contoh" → nanti jadi login
│   ├── FormSheet.jsx       # Bottom sheet "Tambah/Ubah" generik (field teks/angka/tanggal/jam/select/textarea/checkbox, validasi wajib, mode ubah via initialValues, role=dialog, Escape/klik luar)
│   ├── Toast.jsx           # Notifikasi ringkas di atas tab bar: konfirmasi tambah/ubah + tombol "Urungkan" (undo hapus), role=status
│   ├── Dashboard.jsx       # Dashboard baru: hero glass (tombol mata sembunyikan jumlah uang, default tersembunyi), aksi cepat, KPI, chart, Timeline Agenda ringkas (preview 3 hari), panel Pengeluaran Terbaru
│   ├── Budgeting.jsx       # Halaman **Anggaran** (sub-tab Keuangan): kartu pemasukan + editor gaji/rasio (validasi jumlah 100%,
│   │                       #   tombol "Pakai 50/30/20"), 3 kartu keranjang (alokasi vs realisasi, ProgressBar, status Aman/Hati-hati/Lebih,
│   │                       #   daftar pos saran + tombol tambah/ubah/hapus), ringkasan 3 StatCard
│   ├── charts.jsx          # Chart tulis sendiri (tanpa library): BarChart, DonutChart, LineChart, Sparkline — batang & garis bisa diketuk (satu area sentuh besar, keyboard: panah/Home/End/Escape)
│   ├── FamilyCard.jsx      # Card anggota (baris horizontal)
│   ├── FamilyMemberCard.jsx# Card anggota versi besar (centered) — avatar foto/inisial + data diri
│   ├── NoteList.jsx        # Daftar kartu catatan keluarga (ikon kategori, isi 3 baris, badge, pin, tombol Ubah/Hapus)
│   ├── ScheduleItem.jsx    # Item agenda (ikon, judul, jam, tanggal, badge anggota) + tombol Ubah/Hapus
│   ├── Calendar.jsx        # Kalender keluarga (mode Kalender di tab Agenda): view Minggu/Bulan/Tahun,
│   │                       #   warna per member + legenda, agenda hari terpilih, tugas jatuh tempo;
│   │                       #   sorotan "hari ini" (tint 14%) & "terpilih" (tint cta 25% + ring) —
│   │                       #   satu kelas latar per keadaan (hindari urutan CSS Tailwind menimpanya)
│   ├── Timeline.jsx        # Timeline keluarga (mode Timeline di tab Agenda): satu alur kronologis
│   │                       #   gabungan agenda + tugas + pengeluaran + catatan (rel vertikal + titik
│   │                       #   per hari + cabang ke tiap item), chip filter jenis, klik item → sheet Ubah
│   └── TaskList.jsx        # Daftar tugas (controlled: toggle selesai diteruskan ke App, badge prioritas) + tombol Ubah/Hapus
├── assets/
│   ├── logo.png            # LOGO ASLI Kakang (986×844, latar transparan) — sumber tunggal brand & ikon
│   └── profile-rezki.jpg   # FOTO ASLI Kakang (500×500) — sumber foto profil contoh (seed), lihat D20
├── public/                 # Aset statis → disalin apa adanya ke dist/ oleh Vite
│   ├── manifest.json       # PWA manifest (theme/background #0A192F — **tetap navy di tema apa pun**; ikon dari logo; 8 "any" + 2 maskable)
│   ├── service-worker.js   # Cache strategy: static cache-first, API network-first, bg sync, push
│   ├── brand/
│   │   └── logo.png        # Logo ter-trim + transparan (256px) untuk mark di app (header & gerbang)
│   ├── avatars/
│   │   └── profile-rezki.jpg  # Foto profil contoh (256px, ~10 kB) — disajikan app di `/avatars/`
│   └── icons/              # 12 berkas ikon PWA dari logo (lihat bagian Ikon PWA)
├── scripts/
│   └── generate-icons.ps1  # Generator ikon PWA DARI assets/logo.png (`npm run icons`) — System.Drawing, tanpa dependensi Node
├── README.md               # Pintu masuk: cara menjalankan, struktur, apa yang sudah/belum ada
├── PROJECT_SUMMARY.md      # Rencana backend Worker + D1 (belum dibuat)
└── AGENT.md                # File ini
```

> **Status git:** `15f51a2` = proyek **versi lama** (`frontend/` TypeScript, `worker/` Worker + D1 + migrasi, `docs/`, `.github/workflows/deploy.yml`). Commit setelahnya = **app sekarang** (React + Vite + Tailwind di root, PWA, 12 ikon, `.gitignore`) **beserta penghapusan scaffold lama**, lalu commit dokumen (`docs/` dipulihkan sebagai riwayat + catatan status).
> Kode Worker + migrasi D1 lama masih bisa dibaca kapan pun: `git show 15f51a2:worker/...` (lihat `PROJECT_SUMMARY.md`).
> `.gitignore` mengecualikan `node_modules/` dan `dist/`. **Jangan `git push` tanpa izin Kakang.**

---

## Halaman & Fitur (Dummy)

| Section | Isi | Sumber Data |
|---------|-----|-------------|
| Dashboard | Sapaan + hero glass (pengeluaran & anggaran — nilai uang **tersembunyi secara default**, ada tombol mata 44px untuk tampilkan/sembunyikan **hanya di kartu hero**; nilai uang di KPI/chart/panel "Pengeluaran Terbaru" sengaja dibiarkan tampil) + aksi cepat + 4 KPI + chart (tren + donut; bar chart "7 Hari Terakhir" pernah ada tapi sudah dihapus) + 1 panel "Pengeluaran Terbaru" (full width; "Agenda Terdekat" dilepas karena tumpang tindih) + Panel "Timeline Agenda" **ringkas** (preview hari ini + 2 hari, tanpa blok Riwayat & chip filter; tombol "Lihat semua" → Agenda sub-tab Timeline) | `mockData` di `App.jsx` |
| Agenda | Dropdown kategori di tab Agenda (nav HP+desktop) → **satu-satunya filter kategori** (chip kategori di dalam section dihapus — nama filter aktif tampil di judul `SectionHeader`); sub-tampilan **Jadwal | Tugas | Kalender | Timeline** (default Jadwal); **Jadwal** = grid `ScheduleItem` (tombol Ubah/Hapus); **Tugas** = chip filter status/prioritas + `TaskList` (toggle selesai + tombol Ubah/Hapus); **Kalender** = `Calendar.jsx` (Minggu/Bulan/Tahun, warna per member + legenda, daftar agenda hari terpilih, bar tugas jatuh tempo); **Timeline** = `Timeline.jsx` (alur kronologis gabungan 4 modul, rel + titik per hari, chip filter jenis, klik baris → sheet Ubah) | `mockData` di `App.jsx` |
| Keuangan | Sub-tab **Pengeluaran / Anggaran** (default Pengeluaran; `financeMode` di `App.jsx`). **Pengeluaran**: dropdown kategori di tab Keuangan (nav HP+desktop) → **satu-satunya filter** (chip sinkron dihapus); grid `ExpenseCard` (ikon kategori + nominal IDR + tombol Ubah/Hapus) + total terfilter di header; form tambah/ubah punya pilihan **Keranjang** (Otomatis ikut kategori / Kebutuhan / Keinginan / Tabungan & Utang). **Anggaran** (`Budgeting.jsx`, lihat D26): kartu pemasukan (gaji + bulan + 3 baris rasio) + editor inline gaji/rasio — **hanya tersimpan kalau jumlah rasio tepat 100%** (pesan "Jumlah rasio harus 100% (sekarang N%)") + tombol **Pakai 50/30/20**; 3 kartu keranjang (alokasi 50/30/20 vs realisasi pengeluaran, `ProgressBar`, status **Aman / Hati-hati / Lebih** selalu ikon + teks, jumlah "Sisa/Lebih" per keranjang); daftar **pos saran** per keranjang bisa **tambah / ubah / hapus / pindah keranjang** lewat FormSheet; ringkasan 3 `StatCard` (alokasi, realisasi, sisa) | `mockData.budget` (gaji, rasio, pos) + turunan dari `components/budget.js` & `components/categories.js`; ditampilkan oleh `components/Budgeting.jsx` |
| Keluarga | **Papan profil anggota** (lihat `docs/04-KEPUTUSAN-TERKUNCI.md` D17) — sengaja **bukan** modul serba-ada. Dropdown bagian (nav HP+desktop) → **satu-satunya filter**: Semua Keluarga / **Anggota** / **Info Medis** / **Kontak & Darurat** / **Dokumen Penting**. **Anggota** = grid `FamilyMemberCard` yang memuat **data diri** (avatar foto bila ada — contoh: Rezki — atau inisial, nama, peran, umur dihitung dari tanggal lahir, golongan darah, alergi, nomor WA) — 1 kolom di HP, berjejer dari `sm`+; sisanya daftar `FamilyList`. Jadwal imunisasi/kontrol → Agenda; SPP/les/biaya sekolah → Keuangan; keduanya **tidak** diduplikasi di sini | `mockData` di `App.jsx` (`family` / `familyMedical` / `familyContacts` / `familyDocuments`) |
| Catatan | Dropdown filter catatan (nav HP+desktop): Semua/Penting/Daftar Belanja/Rumah & Alat/Dapur & Resep/Ide & Info (badge jumlah) → **satu-satunya filter kategori** (chip sinkron dihapus); **kotak cari** (judul + isi) + grid `NoteList` (kartu + badge kategori + pin "penting" + tombol Ubah/Hapus) | `mockData` di `App.jsx` |
| Notifikasi (lonceng) | Tombol di pojok kanan atas header (sebelum chip pengguna) → panel turun rata kanan berisi **notifikasi turunan data** (anggaran hampir/terlewati, tugas dekat/lewat tenggat, agenda terdekat, pengeluaran terbesar) + badge jumlah belum dibaca + "Tandai semua dibaca"; ketuk item → pindah section + filter disetel | `components/notifications.js` (dihitung dari `mockData`) |
| Akun saya (modal) | **Chip pengguna di header** membuka modal di tengah layar: **foto profil** (pilih/ganti/hapus; foto dikecilkan otomatis ke 256px di canvas → disimpan data URL), **Nama** (inisial dihitung ulang otomatis), **Username** (3–20 huruf kecil/angka/._-; dicek unik antar akun; tampil sebagai `@username` di kartu gerbang), **Password** (kolom profil — bisa diisi/ganti/hapus, **belum diverifikasi siapa pun**), **bagian Tampilan** (radio **Sistem / Terang / Gelap** — langsung berlaku & tersimpan), + pintasan **"Ganti pengguna"** (kembali ke gerbang) | `data.users` di snapshot `bayt-mustaqbal-data-v1` (state di `App.jsx`, modal di `components/AccountModal.jsx`) |
| Tema (terang/gelap) | Tombol ikon di kluster kanan header (**sebelum lonceng**, 44px, ikon matahari/bulan sesuai mode tujuan) mengganti tema sekali ketuk; pilihan lengkap **Sistem / Terang / Gelap** ada di modal Akun › Tampilan. Pilihan **Sistem** mengikuti `prefers-color-scheme` perangkat dan berubah otomatis saat pengaturan perangkat berubah. Skrip boot di `index.html` menyetel tema **sebelum React jalan** (anti-kedip). `<meta name="theme-color">` + warna status bar iOS ikut tema; **splash & ikon PWA tetap navy** (manifest hanya punya satu warna) | localStorage `bm-theme` (`'system'\|'light'\|'dark'`), state di `App.jsx` |

> **Tambah / Ubah / Hapus berfungsi di 4 tab data** (Agenda — Jadwal & Tugas, Keuangan, Catatan; Keluarga baru **tambah**): `SectionHeader` "Tambah" membuka `FormSheet` mode tambah; tombol **Ubah** di kartu membuka `FormSheet` mode ubah (`initialValues` terisi, judul "Ubah …", tombol "Perbarui"); tombol **Hapus** langsung membuang item + `Toast` dengan **"Urungkan"** (6 detik, pulihkan ke posisi semula) — jaring aman pengganti dialog konfirmasi. Item baru/berubah langsung ikut grid, kalender, filter dropdown, dan KPI Dashboard.
>
> **Pencarian catatan**: kotak `type="search"` di tab Catatan menyaring judul + isi (real-time, case-insensitive); filter kategorinya diatur lewat dropdown tab; tanpa hasil → `EmptyState` "Catatan tidak ditemukan".
>
> **Timeline keluarga** (`components/Timeline.jsx`, mode ke-4 di tab Agenda): satu alur kronologis yang menggabungkan **empat modul** — tiap jenis memakai tanggal yang memang sudah ada di data, **tanpa field baru**: agenda `date` (+ `time`), tugas `dueDate`, pengeluaran `date`, catatan **`updatedAt`** (karena catatan belum punya tanggal pembuatan → dilabeli jujur **"Catatan diperbarui"**; menyunting catatan lama memindahkannya ke hari penyuntingan). Urutan alur: **hari ini ke depan** (rencana) lalu blok **"Riwayat"** (yang sudah lewat, terbaru dulu); kalau hari ini belum ada item, penanda "Hari Ini" tetap tampil agar batas lewat/akan datang tidak hilang. Chip filter **jenis** (Semua/Agenda/Tugas/Keuangan/Catatan + jumlah) — bukan filter anggota, karena pengeluaran tidak menyimpan anggota. Tiap baris = tombol utuh (≥ 44px) yang membuka `FormSheet` mode ubah lewat `openEdit(section, item)` yang sudah dipakai tab lain. Tanpa tombol "Tambah" di mode ini (penambahan tetap dari tab asalnya) dan tanpa kotak cari.
> **Mode ringkas untuk Dashboard (D24):** `Timeline.jsx` punya tiga prop opsional — `limitDays` (batasi jumlah hari ke depan), `showHistory` (default `true`), `showFilters` (default `true`). Halaman Agenda memakai default (tampilan penuh). Kartu Dashboard memakai `limitDays={3} showHistory={false} showFilters={false}` + aksi Panel "Lihat semua" (memanggil `onOpenTimeline` di `App.jsx` → menyetel `agendaMode='timeline'` lalu pindah ke tab Agenda). Terukur: preview **873px** vs penuh **4008px**; kartu "Agenda Terdekat" dilepas karena tumpang tindih.
>
> **Persistensi (`localStorage` key `bayt-mustaqbal-data-v1`):** seed awal = `mockData`; setiap perubahan (tambah/ubah/hapus, toggle tugas) disimpan sebagai snapshot, jadi tidak hilang saat reload. Saat dimuat, snapshot **digabung dengan `mockData`** (kunci baru seperti `notes` otomatis terisi walau snapshot lama); snapshot rusak/parsial ditolak (app kembali ke data contoh, tidak blank). Tombol **"Muat ulang data contoh"** di layar gerbang menghapus snapshot dan kembali ke `mockData`.
>
> **Status notifikasi sudah dibaca** disimpan di kunci **terpisah** (`bayt-mustaqbal-notif-read-v1`) karena ini keadaan tampilan, bukan data keluarga — jadi "Muat ulang data contoh" tidak mengembalikan badge belum-dibaca. Id notifikasi diikat ke keadaan (bulan/tanggal/id item) dan id yang sudah tidak ada dibuang saat menyimpan.
>
> **Pilihan tema** disimpan di kunci **terpisah** juga (`bm-theme` = `'system'` | `'light'` | `'dark'`), di luar snapshot data keluarga — karena preferensi tampilan perangkat, bukan data keluarga: "Muat ulang data contoh" **tidak** mengubah tema. Skrip kecil di `<head>` `index.html` membaca kunci ini dan menyetel `data-theme` + `color-scheme` + `<meta theme-color>` **sebelum** React jalan, jadi tidak ada kedipan tema salah saat app dibuka. Pilihan `'system'` mengikuti `prefers-color-scheme` dan berubah otomatis saat pengaturan perangkat berganti (didengar lewat `matchMedia` di `App.jsx`).
>
> **Profil akun** (nama, username, avatar foto, password) tersimpan **di dalam snapshot data keluarga** (`data.users` pada `bayt-mustaqbal-data-v1`) — bukan kunci terpisah, karena ini memang data akun. Konsekuensi yang disengaja: **"Muat ulang data contoh" ikut mengembalikan profil ke contoh**. Foto avatar = data URL JPEG 256×256 (≤ 150 kB, di luar itu ditolak dengan pesan jelas); foto 6,4 MB → ± 25 kB. **Foto contoh (seed)** untuk user `kakang` berbeda: itu berkas statis `/avatars/profile-rezki.jpg` (mirip pola logo) — bukan data URL — supaya muat di produksi & tetap tampil sebelum Kakang menggantinya (D20). Password **belum diverifikasi siapa pun** (belum ada backend) — di modal dinyatakan terang "hanya disimpan di perangkat ini, jangan pakai password asli"; memindahkan verifikasi ke Worker + D1 adalah langkah berikutnya saat backend dibuat.
>
> **Akun (`data.users`) terpisah dari daftar anggota keluarga (`data.family`)**: mengganti nama/foto akun **tidak** mengubah kartu di section Keluarga (nama yang sama muncul sebagai dua entri). Menyatukan keduanya sengaja belum dilakukan supaya tidak ada pencocokan nama yang rapuh — bisa dikerjakan saat anggota keluarga ikut bisa diubah.

> **Angka pengeluaran contoh harus konsisten di tiga tempat (dijaga sejak 13 Okt 2026).** "Total pengeluaran" muncul sebagai **turunan**, bukan angka tersimpan: (1) kartu hero = jumlah semua item `expenses`, (2) tengah donat = jumlah array `categories`, (3) tren bulan berjalan (Okt) = nilai terakhir `monthlyTrend`. Ketiganya **wajib sama** (kini **Rp 6,3 jt**). Donat memuat **6 kategori** (bukan 4) supaya totalnya benar-benar sama dengan `expenses` — butuh token warna `--chart6`. Anggaran contoh `budget.total` = **Rp 8 jt** (6,3 jt ⇒ realisasi 79%, sisa Rp 1,7 jt — di bawah ambang peringatan 80% di `notifications.js`). Kalau salah satu diubah, ubah ketiganya sekaligus.

> **Tidak ada panggilan jaringan.** Data sepenuhnya dummy sesuai permintaan Kakang — fokus ke frontend dulu.

---

## Mobile-First (Fokus HP)

Kakang meminta tampilan dioptimalkan untuk HP — berikut aturan yang berlaku sekarang:

| Aspek | Aturan |
|-------|--------|
| Navigasi < `lg` | **Bottom tab bar** 56px (dikunci `h-[56px]`), 5 tab, area sentuh 60×56px di HP 320px |
| Navigasi ≥ `lg` | Nav atas (pill); tab bar bawah disembunyikan |
| Header | `sticky` (bukan `fixed`) + `pt-[env(safe-area-inset-top)]`; klaster kanan (semua ukuran): **tombol tema → lonceng notifikasi → chip pengguna (buka modal Akun)** |
| Safe area bawah | Tab bar `pb-[env(safe-area-inset-bottom)]`; `<main>` `pb-[calc(4.5rem_+_env(safe-area-inset-bottom))]` |
| Popup install | Kartu kecil di atas tab bar (`bottom-[calc(3.5rem_+_env(safe-area-inset-bottom)_+_0.75rem)]`), pojok kanan bawah di `lg` (`lg:right-6 lg:bottom-6`); lihat D19 |
| Kartu KPI | Nilai uang diringkas di HP (`Rp 6,3 jt`) via `formatCurrencyShort`; nilai penuh di `title` + section Keuangan |
| Anti-overflow | Semua `Card` punya `min-w-0` agar boleh menyusut di grid/flex |
| Sentuh | `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation`; checkbox 28px dengan area sentuh 44px |
| Teks | `-webkit-text-size-adjust: 100%` |

**Hasil verifikasi** (iframe 320/360/390/414/768 px; 5 section + gerbang): **0 overflow horizontal**, **0 elemen interaktif < 44px**; konsol 0 error/0 warning; toggle tugas berfungsi (`aria-pressed` false→true + coret); tambah/ubah/hapus + undo toast + pencarian catatan terverifikasi di browser (data persist lintas reload). (Pernah meluber 44px di 320px pada legenda donut — sudah diperbaiki jadi kolom di HP.)

**Hasil verifikasi notifikasi** (iframe 320px & 1280px): lonceng 44×44, panel 288px muat di 320px (tepi kiri tetap 16px) & rata kanan konten di desktop; badge "4" + `aria-label` "Notifikasi, 4 belum dibaca" + `role="status"` sr-only; "Tandai semua dibaca" menghapus badge + menyimpan 4 id ke `localStorage`; setelah reload status baca tetap; ketuk notifikasi tugas → Agenda › Tugas + filter "Belum Selesai" (5 dari 8); Escape menutup + fokus balik ke lonceng; klik luar & toggle menutup; membuka menu kategori menutup panel; indikator tab tidak bergeser saat panel notifikasi terbuka.

**Hasil verifikasi Timeline** (browser: tab 800px & 1000px + iframe 320×640; lewat `browser.evaluate`): jumlah chip = jumlah data nyata (**Semua 39 = 13 agenda + 8 tugas + 10 pengeluaran + 8 catatan** *(angka saat verifikasi itu; sejak modul Anggaran pengeluaran jadi 11 → chip "Semua" kini **40**)*); urutan alur terbukti benar (14 hari ke depan mulai "13 Oktober 2026" → pemisah "Riwayat — sebelum hari ini" → 10 hari lewat terbaru-dulu, total 24 hari = 25 `<li>`); isi hari & urutan dalam hari benar (14 Okt = 2 tugas lalu 1 pengeluaran); badge "Hari Ini" + titik cyan di hari ini; **jalur "hari ini kosong"** diuji lewat filter (Agenda → penanda "Hari Ini" muncul, 12 hari; Catatan → penanda muncul, 9 hari; urutan = Hari Ini → Riwayat → hari lewat); klik baris "Makan Malam Keluarga" → sheet **"Ubah Agenda"** terisi benar (judul, 2026-10-15, 19:00, keluarga, Rezki YT) + fokus ke field pertama. Geometri: ujung cabang tepat di tepi baris (48,8 = 48,8), pusat titik ≈ pusat rel (selisih 0,2px untuk titik 14px & 21px), tinggi baris 58–94px. 320px: **0 overflow horizontal** (scrollW 310 = clientW 310), pensaklaran 4 kolom @64,2px tanpa label terpotong, 0 baris meluber; 1000px: pensaklaran `inline-flex` 446px satu baris. Aksesibilitas: baris = `<button type="button">` (bisa difokus; `activeElement === tombol`), tanpa `outline-none` → aturan global `:focus-visible { outline: 2px solid var(--brand) }` termuat & berlaku; rel/titik/cabang `aria-hidden`. **Konsol 0 error** di tab bersih; build hijau (CSS 38,35 kB / JS 257,27 kB).

**Catatan jujur uji keyboard Timeline**: pada sesi verifikasi ini jendela browser melaporkan `document.visibilityState === "hidden"` di semua tab, sehingga `browser.press` Tab/Enter tidak terkirim (pada sesi sebelumnya event ini berfungsi). Karena itu yang dibuktikan programatik = baris benar-benar fokusable + aturan `:focus-visible` termuat + tanpa `outline-none`. **Uji Tab/Enter sungguhan pada baris Timeline perlu Kakang lakukan manual** (fokus keyboard + Enter membuka sheet).

**Hasil verifikasi modal Akun** (browser: langsung 800px + iframe 320×640; diuji lewat `browser.evaluate` + `browser.press`): chip membuka modal `role="dialog"` + `aria-modal` + `aria-labelledby` "Akun saya", fokus otomatis ke field Nama; Escape/klik backdrop/Batal/× menutup **dan** fokus balik ke chip; scroll body terkunci saat terbuka lalu pulih; **fokus terlihat** di semua kontrol (Tab sungguhan → `:focus-visible` + outline cyan 2px, termasuk tombol lihat password & Simpan). Validasi: nama kosong/1 karakter, username 2 karakter & format salah, **username duplikat antar akun** → error per-field + fokus pindah ke field bermasalah; password < 6 karakter & "ulangi password tidak sama"; field "Ulangi password" muncul hanya saat password diisi. Unggah foto: PNG 1200×800 → di-crop tengah & dikecilkan ke 256×256 (dibuktikan dengan probe piksel: sudut cyan, tengah merah) → JPEG data URL; foto noise 6,4 MB → 25 kB; berkas non-gambar → "Berkas ini bukan gambar…", HEIC tak terbaca → pesan jelas (foto lama tetap aman); "Hapus foto" → kembali inisial. Simpan → nama/username/avatar/password masuk snapshot + inisial dihitung ulang (nama 3 kata → "RT") + toast "Profil akun diperbarui"; **bertahan setelah reload** (kartu gerbang menampilkan foto). Modal di 320×640: panel 288px (tepi 16px), tidak meluber, isi 779px → scroll internal panel, tombol lihat password 44×44. Regresi: panel notifikasi & dropdown kategori tetap jalan, FormSheet tetap terbuka/tutup, konsol 0 error setelah reload bersih.

**Hasil verifikasi tema (gelap & terang)** (browser 800px + iframe 320/360/768px; `browser.evaluate` + hitung kontras WCAG dari warna render nyata):

- **Mode gelap = no-op visual**: dibandingkan sebelum perubahan, semua nilai terukur identik — kanvas `rgb(10,25,47)`, nada `-200`, titik anggota `-400`, `.glass` putih 6%/2%, `--shadow-e1` inset putih 5% + `rgba(2,8,20,0.4)`, `bg-toneamber/15` = `rgba(251,191,36,…)`.
- **Mode terang**: kanvas `#F2FAFD`, permukaan `#FFFFFF`, `color-scheme: light`, `<meta theme-color>` `#F2FAFD`, status bar iOS `default`, kaca putih 88%/72%, glows/grid/bayangan/nada semua ter-swap; **27/27 pasangan teks lolos** (terendah nada rose 4,95:1), **5/5 titik anggota ≥3:1**; pemisah `line` 1,39:1 (dekoratif — setara gelap 1,45:1).
- **Pindai sisa warna gelap** di mode terang (`browser.evaluate` menelusuri `color`/`background-color`/`border-*`/`outline`/`stroke`/`fill` seluruh DOM, dicocokkan ke daftar nilai khas gelap): **0 temuan** di Beranda, Agenda (Jadwal/Tugas/Kalender/Timeline), Keuangan, Keluarga, Catatan, panel notifikasi, modal Akun, FormSheet, dan gerbang.
- **Tombol tema header**: sekali klik membalik tema + menyimpan `bm-theme` + memperbarui meta; klik lagi kembali. **Modal Akun › Tampilan**: 3 radio asli (`system`/`light`/`dark`), klik Gelap → `data-theme='dark'` + meta `#0A192F` + tersimpan; klik Terang → kembali; legend "Tampilan".
- **Chart**: busur donat terang memakai `rgb(var(--chart1..6))` (8 145 178 / 37 99 235 / 124 58 237 / 180 83 9 / 5 150 105 / 190 18 60) + alur `rgb(var(--donut-track))` 201 222 233; gradasi batang berakhir transparan; titik anggota legenda 5 warna + bar tugas `mutedfg/60` (dulu `white/60` → tak terlihat di terang).
- **Kalender**: pada viewport **benar** 320px (clientWidth 321) sel hari = **44,74px ≥ 44**; sorotan hari ini tint 14% (kontras 5,9:1 terang / 7,42:1 gelap) & hari terpilih tint cta 25% + ring (8,6:1 / 11,33:1) — keduanya kini benar-benar terlihat (dulu tertimpa `bg-surface` karena urutan aturan Tailwind; diperbaiki jadi satu kelas latar per keadaan, berlaku di **kedua** tema).
- **Sel "bulan ini" (view Tahun)** diperbaiki dari tint 40% ke 14%: kontras nama/jumlah 5,9/5,17 (terang) & 7,42/5,04 (gelap) — sebelumnya 3,96/3,47 & 3,85/2,62 (gagal ≥4,5).
- **Luber & target sentuh**: 0 overflow horizontal di 320/360/768 (5 section + modal Akun); tab nav 56px, chip 44px.
- **Konsol**: 0 error / 0 warning (hanya info React DevTools). Build hijau: CSS 42,20 kB / JS 260,64 kB.
- **Batas jujur**: karena tab browser sesi ini melaporkan `visibilityState === "hidden"`, transisi CSS membeku di nilai awal sehingga nilai terhitung setelah *klik* bisa "tergeser"; pengukuran karena itu dilakukan **setelah muat ulang** (mount bersih) atau dengan transisi dimatikan sementara. Uji visual akhir (mata manusia) tetap disarankan Kakang lakukan sendiri.

**Hasil verifikasi tombol mata jumlah uang (Dashboard)** (`browser.evaluate` + iframe 320px, tema gelap & terang): tombol 44×44 dengan `aria-pressed` (false = tersembunyi) + `aria-label` berganti ("Tampilkan/Sembunyikan jumlah pengeluaran") + ikon `eye`/`eyeOff`; saat tersembunyi teks jadi "Rp ••••••" dan `title` **dikosongkan** (agar tak bocor lewat tooltip) dan ada teks `sr-only` "Jumlah pengeluaran disembunyikan"; nilai "Sisa dari" dan "Sisa" di kartu yang sama ikut tersembunyi; klik 1 → tampil ("Rp 6.300.000"), klik 2 → tersembunyi lagi; **0 overflow di 320px** baik tersembunyi maupun tampil; pilihan **tidak disimpan** (tiap app dibuka kembali tersembunyi).
>
> **Cakupan mask = hanya kartu hero (keputusan Kakang, 13 Okt 2026).** Diukur di DOM: dari **24 simpul teks ber-"Rp"** di `#main`, hanya **3** yang berubah saat tombol ditekan — semuanya di dalam kartu hero (total pengeluaran, "Sisa dari", dan nilai "Sisa"). Tetap tampil: KPI "Sisa anggaran" (`Rp 1,7 jt` + hint `dari Rp 8 jt`), ringkasan `rata-rata` tren, label chart (`Okt: Rp 6,3 jt`, `Sab: Rp 420 rb`), dan donat (`Rp 750 rb`). Tidak ada rencana memperluas ke seluruh app.

---

## Logo & Ikon PWA

**Sumber tunggal:** `assets/logo.png` (logo Kakang, 986×844, latar transparan). Skrip `scripts/generate-icons.ps1` (`npm run icons`) memotong pinggiran transparan (trim ke kotak konten), lalu menurunkan ukuran dengan `System.Drawing` (PowerShell, **tanpa dependensi Node/npm**).

| Berkas | Kegunaan |
|--------|----------|
| `public/icons/icon-{72,96,128,144,152,192,384,512}.png` | `purpose: any` — logo di atas latar navy, konten 86% |
| `public/icons/maskable-{192,512}.png` | `purpose: maskable` — latar navy, konten 68% (aman di safe zone 80% Android) |
| `public/icons/apple-touch-icon.png` | 180px, latar navy, konten 86% |
| `public/icons/favicon.ico` | 16/32/48 px (PNG di dalam ICO), latar navy, konten 92% |
| `public/brand/logo.png` | 256px, **transparan** (hasil trim) — untuk mark di header & layar gerbang |

**Latar ikon navy `#0A192F`** (bukan transparan/putih) dipilih karena artwork logo mayoritas terang (putih/abu/cyan, ~18% piksel >235) dengan sedikit area biru gelap → butuh latar gelap agar kontras; navy juga = warna tema app + `background_color` manifest (splash nyatu). Ubah `$IconBg` / `$Ratio*` di bagian KONFIGURASI skrip lalu jalankan ulang `npm run icons` bila ingin latar/himpit lain.

**Dipakai di app:** mark `public/brand/logo.png` di header (`Navigation.jsx`, tile 36px) dan **logo besar** di layar gerbang (`WelcomeGate.jsx`, max 200–240px sebagai gambar utama — menggantikan ilustrasi SVG lama + judul teks `h1`; `soft-pulse` ikut dihapus, nama app dibawa `alt="Bayt Mustaqbal"`); ikon app di popup "Pasang app" (`index.html`, `icons/icon-192.png`). Ikon nav Dashboard tetap ikon SVG `home` — mark merek sudah diwakili logo.

**Foto profil contoh:** `assets/profile-rezki.jpg` (500×500, milik Kakang) dikecilkan sekali ke **256×256** → `public/avatars/profile-rezki.jpg` (~10 kB, crop tengah, JPEG q82) dan dipakai sebagai avatar seed user `kakang` **dan** anggota keluarga "Rezki YT" (`/avatars/profile-rezki.jpg`). Ditambah ke precache service worker; versi cache dinaikkan ke `v9`. Foto ini **bukan** hasil `npm run icons` (tidak ada langkah build khusus) — satu kali pengecilan dengan `System.Drawing`.

**Verifikasi:** ukuran & format tiap PNG dicek (kotak 72…512, `Format32bppArgb`), sudut ikon = navy opak (alpha 255), logo brand ter-trim 256×221 termuat di browser (`naturalWidth`>0) di gerbang & header, 0 error konsol, `npm run build` hijau + semua berkas tersalin ke `dist/`.

---

## Commands

```bash
# Dev
npm install
npm run dev          # Vite → http://localhost:3000 (3001 kalau 3000 dipakai)

# Live server cara cepat (Windows) - klik dua kali dev.bat
#   dev.bat            # server lokal + buka browser (auto npm install bila perlu)
#   dev.bat lan        # buka juga ke jaringan (akses dari HP / PWA)
#   dev.bat noopen     # jalankan tanpa membuka browser

# Build
npm run build        # Output: ./dist (untuk Cloudflare Pages)

# Ikon PWA (dari assets/logo.png → public/icons + public/brand)
npm run icons        # PowerShell + System.Drawing, tanpa dependensi npm

# Preview build
npx vite preview
```

---

## PWA: Cara Kerja

- **Popup "Pasang app" (D19):** satu-satunya titik masuk pasang. Muncul saat `beforeinstallprompt` **dan** setelah pengguna lewat gerbang (sinyal `bm:entered` dari `App.jsx`), tampil **5 detik lalu hilang sendiri** (`INSTALL_PROMPT_MS`), muncul lagi tiap browser di-refresh, dan **berhenti permanen setelah terpasang** (`display-mode: standalone` / `navigator.standalone` + event `appinstalled`). Tanpa `localStorage` — kunci lama `skipInstallPrompt` sudah tidak dipakai
- **Network status:** **toast** sesaat di atas saat status berubah (teal "Tersambung kembali" / merah "Koneksi terputus", hilang otomatis 3 detik). Status offline yang menetap ditampilkan **banner** di dalam `<main>` — jadi tidak dobel saat pertama kali dibuka
- **Auto-sync:** saat event `online` → `registration.sync.register('family-api-sync')`
- **Service Worker:**
  - Static assets → **cache-first**
  - `/api/*` → **network-first**, fallback cache
  - **Background sync** untuk request gagal (queue di localStorage)
  - **Push notification** handler (belum ada server push)
- **Offline banner:** muncul saat `navigator.onLine === false` — ikon + teks (bukan warna saja)

---

## Known Issues (Perbaiki Sebelum Deploy)

| Issue | Dampak | Solusi |
|-------|--------|--------|
| ~~`cdn.tailwindcss.com should not be used in production`~~ | ~~Warning, bundle besar~~ | **SELESAI:** Tailwind dipindah ke PostCSS (`tailwind.config.js` + `postcss.config.js`); CSS ter-generate 19 kB (gzip 4,6 kB) |
| ~~`icon-144.png 404`~~ | ~~Install prompt tidak ada ikon~~ | **SELESAI:** 12 ikon dibuat dari logo via `npm run icons` → `public/icons/`; manifest dipecah `any` + `maskable` |
| ~~`favicon.ico` kosong (0 byte)~~ | ~~Ikon tab browser default~~ | **SELESAI:** `favicon.ico` asli (16/32/48, PNG di dalam ICO) + `apple-touch-icon.png` 180px |
| ~~Aset statis tidak ikut ke `dist/`~~ | ~~`manifest.json`, `service-worker.js`, `icons/*` 404 di produksi → install PWA & mode offline mati~~ | **SELESAI:** ketiganya dipindah ke `public/` (Vite menyalin `public/` apa adanya ke `dist/`) |
| ~~`service-worker.js` reference path component~~ | ~~SW cache `addAll` mungkin gagal~~ | **SELESAI:** cache list dirampingkan + 3 ikon; berkas kini di `public/` |
| Data dummy hardcode | Bukan data real | Bangun Worker + D1, ganti seed `mockData` + persist `localStorage` dengan state + fetch |
| Belum ada `wrangler.toml` | Backend belum jalan | Buat Worker + D1 binding |
| ~~Belum ada edit/hapus item~~ | ~~Hanya bisa tambah + toggle selesai~~ | **SELESAI:** `ItemActions` (Ubah/Hapus) di kartu agenda/pengeluaran/tugas/catatan; ubah lewat `FormSheet` mode edit; hapus cepat + `Toast` "Urungkan" (undo). Keluarga baru **tambah** (belum ubah/hapus anggota & sub-bagian) |
| Password akun hanya kolom profil | Belum ada verifikasi sungguhan (siapa pun yang memegang perangkat bisa masuk) | Sudah dinyatakan terang di modal ("disimpan di perangkat ini, jangan pakai password asli"). Tutup dengan auth Worker + D1 (bcrypt/JWT) saat backend dibuat — **jangan** dipakai sebagai pengaman nyata sebelum itu |
| Profil akun ≠ data anggota keluarga | Ganti nama/foto akun tidak mengubah kartu section Keluarga (nama bisa tampak ganda) | Sengaja dibiarkan (hindari pencocokan nama yang rapuh). Kerjakan saat anggota keluarga bisa diubah/hapus |
| Catatan di Timeline memakai tanggal **terakhir diubah** | Menyunting catatan lama memindahkannya ke hari penyuntingan (posisi di alur berubah) | Sudah dilabeli terang "Catatan diperbarui" (bukan "dibuat"). Tambahkan field tanggal catatan saat backend dibuat |
| ~~**Header luber horizontal pada viewport 1024–1109px** (ditemukan 13 Okt 2026 saat verifikasi D18; **sudah ada sebelum** perubahan latar — mematikan lapisan `.app-bg` tidak mengubah angkanya)~~ | ~~Klaster kanan header (tombol notifikasi + tombol "Pasang", total 343px) melewati tepi sampai **95px** pada 1024px; `scrollWidth` mentok **1109px**~~ | **SELESAI (D19):** tombol "Pasang" di header dihapus (klaster kanan −121px). Terukur ulang setelah masuk app: `scrollWidth = clientWidth` (**luber 0**) di 320 / 390 / 1024 / 1056 / 1090 / **1109** / 1120 / 1152 / 1280; media query `lg` dipastikan aktif pada 1024 (`matchMedia('(min-width:1024px)').matches = true`) |
| **iOS/iPadOS tidak punya jalan pasang dari dalam app** (konsekuensi D19) | Di Safari iOS, `beforeinstallprompt` **tidak pernah ada**, jadi popup 5 detik tak akan muncul. Karena tombol permanen sudah dihapus, pengguna iOS hanya bisa lewat **Bagikan → "Tambahkan ke Layar Utama"** (sebelumnya pun tombol lama **tidak bereaksi** di iOS — jadi bukan kemunduran, tapi sekarang tidak ada petunjuk apa pun) | Tambahkan petunjuk manual khusus iOS di popup (deteksi UA + cek sudah standalone) saat fase deploy/backend. Belum dikerjakan |

---

## Rencana (Roadmap — BELUM DIBUAT)

**Backend (Cloudflare Worker + D1):**
- Auth: JWT (HS256) + bcryptjs
- Modul: auth, transactions, bills, recurring, categories, attendance, calendar, service, notes, review, dashboard, settings, notifikasi WA (Fonnte)
- Cron: daily digest (07:00), bill reminder (hourly), monthly generate (tgl 1)
- Notifikasi: Fonnte WhatsApp API

**Frontend (evolusi):**
- Login + role admin/user, data nyata (bukan `mockData`), form input & validasi (bottom sheet "Tambah/Ubah" **sudah ada** beserta hapus + undo — tinggal sinkron ke server); profil akun (nama/username/avatar/password) **sudah ada** di modal "Akun saya" — tinggal pindah ke auth sungguhan (username + password jadi kredensial nyata, avatar disimpan sebagai berkas/URL)
- Tetap React 18 + Vite + Tailwind, mobile-first. **Tanpa TypeScript & tanpa router** — 5 section yang sudah ada diperdalam, bukan ditambah jadi 11 halaman
- **Modul Anggaran 50/30/20 sudah dikerjakan (D26)**: sub-tab Keuangan → **Anggaran** (gaji + rasio bisa diubah, alokasi 50/30/20, realisasi dari field `bucket` pengeluaran, pos saran per keranjang). Saat backend dibuat, cukup simpan `budget.income`/`ratios`/`pos` + kolom `bucket` pada pengeluaran — angka lain tetap dihitung di klien

**Deploy:**
- Cloudflare Pages (frontend statis: `npm run build` → `dist/`) + Worker (backend)
- `.github/workflows/deploy.yml` **sudah dihapus** (menunjuk `frontend/` + `worker/` yang tidak ada) — tulis ulang saat setup deploy
- Custom domain: `app.baytmustaqbal.my.id`

**Bungkus jadi app native (Capacitor) — SETELAH pengembangan selesai (D25):**
- Selama pengembangan **tetap PWA** (kanal utama). Capacitor = kanal **tambahan** Android/iOS, bukan pengganti — satu basis kode, tanpa ubah desain
- Paket: `@capacitor/core` + `@capacitor/cli` + `@capacitor/android` (`ios` bila perlu); `webDir: 'dist'`
- Dua mode muat aset (**bundled** vs `server.url`) → diputuskan saat itu; `localStorage` di dalam app berbeda dari Chrome (aman, karena D1 jadi sumber kebenaran)
- Popup "Pasang app" (D19) tidak relevan di dalam app (`beforeinstallprompt` tidak pernah muncul)
- iOS: butuh macOS + Xcode + akun Apple Developer berbayar — siapkan lebih awal kalau Istri memakai iPhone

> **Peta dokumen (penting) — jangan tertukar:**
> - `AGENT.md` + `DESIGN-SYSTEM.md` → kondisi **nyata** app sekarang (React + Vite + Tailwind PWA, data dummy)
> - `README.md` → pintu masuk: cara menjalankan (`npm run dev`), struktur berkas, apa yang sudah & belum ada
> - `PROJECT_SUMMARY.md` → **rencana** backend Cloudflare Worker + D1 (15 tabel, endpoint, cron, secret, D1–D16) — **belum dibuat**
> - `docs/01–04` + `docs/SETUP-FONNTE.md` → **riwayat** rencana FAMILY OS versi **Google Sheets + Apps Script**. Stack-nya sudah digantikan (D4/D7/D8 gugur), tetapi **keputusan produknya tetap berlaku** (D1 admin/user, D5, D6, D9, D11, D13, D15, D16). Tiap berkas sudah diberi catatan status di bagian atas.
>
> Verifikasi dulu apakah isinya masih sesuai sebelum implementasi.

---

## Aturan Wajib untuk Agent

1. **Jangan** asumsikan API/DB sudah ada — data masih **dummy murni** (seed `mockData` + persist `localStorage`), jangan tambahkan `fetch` tanpa persetujuan Kakang.
2. **Jangan** `git push` tanpa konfirmasi eksplisit Kakang (larangan keras).
3. **Selalu** jalankan `npm run dev` + cek Console (F12) sebelum klaim "beres".
4. **Tailwind sudah pakai PostCSS** (`tailwind.config.js`) — tambah kelas/utility di sana, bukan lewat CDN.
5. **Soft delete** saja nanti di D1 (kolom `void`), jangan hard delete.
6. **Query D1 nanti** pakai nama header, bukan indeks kolom.
7. **Jangan** commit secret — pakai `wrangler secret put`.

---

## Troubleshooting Cepat

| Masalah | Penyebab | Fix |
|---------|----------|-----|
| Blank white di browser | Cache lama / file:// | `npm run dev`, buka `http://localhost:3000`, **Hard Reload (Ctrl+F5)** |
| CORS error di console | Buka via `file://` | Harus lewat `http://localhost`, bukan klik langsung `index.html` |
| `Port 3000 in use` | Server lain | Vite otomatis ke 3001, atau matikan proses lama |
| Ikon 404 / manifest & SW tidak ikut build | Aset statis ditaruh di root project, bukan di `public/` | Taruh `manifest.json`, `service-worker.js`, `icons/` di `public/`; buat ulang ikon dengan `npm run icons` (lihat bagian **Logo & Ikon PWA**) |
| Kelas Tailwind tidak berefek | File tak tercakup `content` | Tambahkan path di `tailwind.config.js` → `content` |

---

*Generated for AI agents working on Bayt Mustaqbal project.*
*Last updated: 2026-10-14 — **Modul Anggaran 50/30/20 dibangun (D26)**: sub-tab Keuangan **Pengeluaran / Anggaran**, halaman `Budgeting.jsx` (kartu pemasukan + editor gaji/rasio yang hanya tersimpan kalau jumlah rasio 100%, 3 keranjang alokasi vs realisasi + status Aman/Hati-hati/Lebih, pos saran tambah/ubah/hapus/pindah keranjang), field **Keranjang** di form pengeluaran (default otomatis ikut kategori), data contoh 11 pengeluaran Rp 6,3 jt / 9 kategori + token `--chart7/8/9`, semua pembaca lewat `getBudget` (snapshot lama `budget.total` tetap aman). Sebelumnya: **tetap PWA** selama pengembangan; **Capacitor** dikerjakan setelah pengembangan selesai sebagai kanal tambahan Android/iOS (D25 — rencana, belum dikerjakan, nol perubahan kode). Sebelumnya: urutan kartu Dashboard: "Pengeluaran Terbaru" dipindah ke **atas** "Timeline Agenda" (permintaan Kakang; blok uang berkumpul di atas, timeline jadi penutup) (D24 lanjutan). Sebelumnya: kartu "Timeline Agenda" di Dashboard dibuat **ringkas** (preview hari ini + 2 hari, tanpa blok Riwayat & chip filter, + tombol "Lihat semua" ke Agenda → sub-tab Timeline); kartu "Agenda Terdekat" dilepas (D24). Sebelumnya: Timeline (alur aktivitas) ditambahkan ke Dashboard sebagai Panel "Timeline Agenda" (D23). Sebelumnya: card "7 Hari Terakhir" dihapus dari Dashboard (donut "Komposisi" jadi full-width; komponen BarChart & data `weekly` tetap ada) (D22). Sebelumnya: angka pengeluaran contoh disatukan jadi **Rp 6,3 jt** di hero, donat (kini 6 kategori + token `--chart6`), dan tren Okt; anggaran contoh naik ke **Rp 8 jt** (D21); foto profil contoh Kakang (`assets/profile-rezki.jpg` → `public/avatars/profile-rezki.jpg`, 256px) jadi avatar seed user `kakang` + kartu anggota "Rezki YT"; `FamilyMemberCard` kini pakai `Avatar` (foto/inisial) (D20).*
