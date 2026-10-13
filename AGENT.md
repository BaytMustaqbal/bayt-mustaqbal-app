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
- **Styling:** Tailwind CSS via **PostCSS** (`tailwind.config.js` + `postcss.config.js`) + `App.css` custom — design system **High-Tech Blue**: dark navy `#0A192F` + electric cyan `#22D3EE`, glassmorphism terukur, glow tipis. **Skala elevasi** (`e1`/`e2`/`pop`/`nav`), token durasi/easing (`duration-fast/base/slow`, `ease-smooth/crisp`), dan konstanta hover kartu (`CARD_INTERACTIVE`) ada di `tailwind.config.js` + `components/ui.jsx` (lihat `DESIGN-SYSTEM.md` §5 & §12)
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
├── index.html              # Entry PWA: Plus Jakarta Sans, manifest, install prompt, network monitor
├── main.jsx                # React entry: createRoot → render <App /> ke #root + registrasi SW (production)
├── App.jsx                 # Root: 5 section + layar gerbang (pilih pengguna) + data dummy (seed) + persist localStorage + bottom sheet Tambah/Ubah + toast (undo hapus) + banner offline
├── App.css                 # Tailwind (@tailwind base/components/utilities) + design token, focus-visible, scrollbar, animasi
├── tailwind.config.js      # Theme tokens: warna, skala elevasi (e1/e2/pop/nav), durasi+easing gerak + content paths
├── postcss.config.js       # Plugin: tailwindcss + autoprefixer
├── vite.config.js          # Vite config: react plugin, port 3000
├── package.json            # Deps: react, react-dom, vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer
├── DESIGN-SYSTEM.md        # Design system: High-Tech Blue, tipografi, layout, komponen, PWA, a11y
├── components/
│   ├── Icon.jsx            # Set ikon SVG inline (home, calendar, wallet, users, tasks, note, pin, utensils, edit, trash, search, undo, barChart, target, chevron dll.)
│   ├── ui.jsx              # Primitif UI: Card, GlassCard, SectionHeader, StatCard, ProgressBar,
│   │                       #   QuickAction, EmptyState, ExpenseCard, ItemActions, Badge, FamilyList, CTA_CLASS
│   ├── Navigation.jsx      # Header sticky glass (merek + nav lg+ + chip pengguna) + bottom tab bar 56px glass;
│   │                       #   tab Agenda, Keuangan, Keluarga & Catatan = dropdown filter (animasi, badge jumlah, a11y menu)
│   ├── categories.js       # Kategori agenda, keuangan, keluarga, catatan + filter tugas & penghitung per item + meta ikon
│   ├── WelcomeGate.jsx     # Layar gerbang tiap app dibuka: pilih pengguna (localStorage) + tombol "Muat ulang data contoh" → nanti jadi login
│   ├── FormSheet.jsx       # Bottom sheet "Tambah/Ubah" generik (field teks/angka/tanggal/jam/select/textarea/checkbox, validasi wajib, mode ubah via initialValues, role=dialog, Escape/klik luar)
│   ├── Toast.jsx           # Notifikasi ringkas di atas tab bar: konfirmasi tambah/ubah + tombol "Urungkan" (undo hapus), role=status
│   ├── Dashboard.jsx       # Dashboard baru: hero glass, aksi cepat, KPI, chart, daftar terbaru
│   ├── charts.jsx          # Chart tulis sendiri (tanpa library): BarChart, DonutChart, LineChart, Sparkline
│   ├── FamilyCard.jsx      # Card anggota (baris horizontal)
│   ├── FamilyMemberCard.jsx# Card anggota versi besar (centered)
│   ├── NoteList.jsx        # Daftar kartu catatan keluarga (ikon kategori, isi 3 baris, badge, pin, tombol Ubah/Hapus)
│   ├── ScheduleItem.jsx    # Item agenda (ikon, judul, jam, tanggal, badge anggota) + tombol Ubah/Hapus
│   ├── Calendar.jsx        # Kalender keluarga (mode Kalender di tab Agenda): view Minggu/Bulan/Tahun,
│   │                       #   warna per member + legenda, agenda hari terpilih, tugas jatuh tempo
│   └── TaskList.jsx        # Daftar tugas (controlled: toggle selesai diteruskan ke App, badge prioritas) + tombol Ubah/Hapus
├── assets/
│   └── logo.png            # LOGO ASLI Kakang (986×844, latar transparan) — sumber tunggal brand & ikon
├── public/                 # Aset statis → disalin apa adanya ke dist/ oleh Vite
│   ├── manifest.json       # PWA manifest (theme #0A192F; ikon dari logo; 8 "any" + 2 maskable)
│   ├── service-worker.js   # Cache strategy: static cache-first, API network-first, bg sync, push
│   ├── brand/
│   │   └── logo.png        # Logo ter-trim + transparan (256px) untuk mark di app (header & gerbang)
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
| Dashboard | Sapaan + hero glass (pengeluaran & anggaran) + aksi cepat + 4 KPI + chart (tren/bar/donut) + 2 panel ringkasan | `mockData` di `App.jsx` |
| Agenda | Dropdown kategori di tab Agenda (nav HP+desktop) → filter; sub-tampilan **Jadwal | Tugas | Kalender** (default Jadwal); **Jadwal** = grid `ScheduleItem` (tombol Ubah/Hapus) + chip kategori; **Tugas** = chip filter status/prioritas + `TaskList` (toggle selesai + tombol Ubah/Hapus); **Kalender** = `Calendar.jsx` (Minggu/Bulan/Tahun, warna per member + legenda, daftar agenda hari terpilih, bar tugas jatuh tempo) | `mockData` di `App.jsx` |
| Pengeluaran | Dropdown kategori di tab Keuangan (nav HP+desktop) → filter; grid `ExpenseCard` (ikon kategori + nominal IDR + tombol Ubah/Hapus) + chip sinkron + total terfilter di header | `mockData` di `App.jsx` |
| Keluarga | Dropdown bagian (nav HP+desktop) → filter; grid `FamilyMemberCard` (avatar inisial + badge status) + daftar sub-bagian `FamilyList` (Kesehatan / Pendidikan Anak / Kontak & Darurat, 3–5 item tiap bagian) + chip sinkron; "Semua Keluarga" = semua bagian bertumpuk | `mockData` di `App.jsx` |
| Catatan | Dropdown filter catatan (nav HP+desktop): Semua/Penting/Daftar Belanja/Rumah & Alat/Dapur & Resep/Ide & Info (badge jumlah) + chip sinkron; **kotak cari** (judul + isi) + grid `NoteList` (kartu + badge kategori + pin "penting" + tombol Ubah/Hapus) | `mockData` di `App.jsx` |

> **Tambah / Ubah / Hapus berfungsi di 4 tab data** (Agenda — Jadwal & Tugas, Keuangan, Catatan; Keluarga baru **tambah**): `SectionHeader` "Tambah" membuka `FormSheet` mode tambah; tombol **Ubah** di kartu membuka `FormSheet` mode ubah (`initialValues` terisi, judul "Ubah …", tombol "Perbarui"); tombol **Hapus** langsung membuang item + `Toast` dengan **"Urungkan"** (6 detik, pulihkan ke posisi semula) — jaring aman pengganti dialog konfirmasi. Item baru/berubah langsung ikut grid, chip, kalender, dan KPI Dashboard.
>
> **Pencarian catatan**: kotak `type="search"` di tab Catatan menyaring judul + isi (real-time, case-insensitive) di atas filter kategori; tanpa hasil → `EmptyState` "Catatan tidak ditemukan".
>
> **Persistensi (`localStorage` key `bayt-mustaqbal-data-v1`):** seed awal = `mockData`; setiap perubahan (tambah/ubah/hapus, toggle tugas) disimpan sebagai snapshot, jadi tidak hilang saat reload. Saat dimuat, snapshot **digabung dengan `mockData`** (kunci baru seperti `notes` otomatis terisi walau snapshot lama); snapshot rusak/parsial ditolak (app kembali ke data contoh, tidak blank). Tombol **"Muat ulang data contoh"** di layar gerbang menghapus snapshot dan kembali ke `mockData`.

> **Tidak ada panggilan jaringan.** Data sepenuhnya dummy sesuai permintaan Kakang — fokus ke frontend dulu.

---

## Mobile-First (Fokus HP)

Kakang meminta tampilan dioptimalkan untuk HP — berikut aturan yang berlaku sekarang:

| Aspek | Aturan |
|-------|--------|
| Navigasi < `lg` | **Bottom tab bar** 56px (dikunci `h-[56px]`), 5 tab, area sentuh 60×56px di HP 320px |
| Navigasi ≥ `lg` | Nav atas (pill) + tombol Pasang; tab bar bawah disembunyikan |
| Header | `sticky` (bukan `fixed`) + `pt-[env(safe-area-inset-top)]` |
| Safe area bawah | Tab bar `pb-[env(safe-area-inset-bottom)]`; `<main>` `pb-[calc(4.5rem_+_env(safe-area-inset-bottom))]` |
| Banner install | Diposisikan tepat di atas tab bar (`bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))]`, `lg:bottom-0`) |
| Kartu KPI | Nilai uang diringkas di HP (`Rp 2,8 jt`) via `formatCurrencyShort`; nilai penuh di `title` + section Keuangan |
| Anti-overflow | Semua `Card` punya `min-w-0` agar boleh menyusut di grid/flex |
| Sentuh | `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation`; checkbox 28px dengan area sentuh 44px |
| Teks | `-webkit-text-size-adjust: 100%` |

**Hasil verifikasi** (iframe 320/360/390/414/768 px; 5 section + gerbang): **0 overflow horizontal**, **0 elemen interaktif < 44px**; konsol 0 error/0 warning; toggle tugas berfungsi (`aria-pressed` false→true + coret); tambah/ubah/hapus + undo toast + pencarian catatan terverifikasi di browser (data persist lintas reload). (Pernah meluber 44px di 320px pada legenda donut — sudah diperbaiki jadi kolom di HP.)

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

**Dipakai di app:** mark `public/brand/logo.png` di header (`Navigation.jsx`, tile 36px) dan **logo besar** di layar gerbang (`WelcomeGate.jsx`, max 200–240px sebagai gambar utama — menggantikan ilustrasi SVG lama + judul teks `h1`; `soft-pulse` ikut dihapus, nama app dibawa `alt="Bayt Mustaqbal"`); ikon app di banner "Pasang" (`index.html`, `icons/icon-192.png`). Ikon nav Dashboard tetap ikon SVG `home` — mark merek sudah diwakili logo.

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

- **Install prompt:** muncul saat `beforeinstallprompt` (setelah 3x kunjungan, bisa di-skip via localStorage)
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

---

## Rencana (Roadmap — BELUM DIBUAT)

**Backend (Cloudflare Worker + D1):**
- Auth: JWT (HS256) + bcryptjs
- Modul: auth, transactions, bills, recurring, categories, attendance, calendar, service, notes, review, dashboard, settings, notifikasi WA (Fonnte)
- Cron: daily digest (07:00), bill reminder (hourly), monthly generate (tgl 1)
- Notifikasi: Fonnte WhatsApp API

**Frontend (evolusi):**
- Login + role admin/user, data nyata (bukan `mockData`), form input & validasi (bottom sheet "Tambah/Ubah" **sudah ada** beserta hapus + undo — tinggal sinkron ke server)
- Tetap React 18 + Vite + Tailwind, mobile-first. **Tanpa TypeScript & tanpa router** — 5 section yang sudah ada diperdalam, bukan ditambah jadi 11 halaman

**Deploy:**
- Cloudflare Pages (frontend statis: `npm run build` → `dist/`) + Worker (backend)
- `.github/workflows/deploy.yml` **sudah dihapus** (menunjuk `frontend/` + `worker/` yang tidak ada) — tulis ulang saat setup deploy
- Custom domain: `app.baytmustaqbal.my.id`

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
*Last updated: 2026-10-13 — logo Kakang (`assets/logo.png`) jadi mark app + ikon PWA (script ikon pindah ke PowerShell); ilustrasi SVG gerbang diganti logo besar.*
