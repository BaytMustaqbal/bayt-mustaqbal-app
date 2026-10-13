# Bayt Mustaqbal — Manajemen Keluarga

Web app keluarga untuk **2 pengguna**: Kakang (admin) + Istri.
Isi sekarang: 5 section — Dashboard, Agenda (Jadwal/Tugas/Kalender), Keuangan, Keluarga, Catatan.

> **Status — 13 Okt 2026:** **frontend sudah jalan, backend belum dibuat.**
> Semua angka masih **data dummy** (`const data = mockData` di `App.jsx`) — belum ada `fetch` ke mana pun.
>
> Peta dokumen (jangan tertukar):
> - **`AGENT.md`** — aturan kerja + kondisi nyata proyek → baca ini dulu
> - **`DESIGN-SYSTEM.md`** — token desain, navigasi, target sentuh
> - **`PROJECT_SUMMARY.md`** — **rencana** backend Cloudflare Worker + D1 (belum dibuat)
> - **`docs/`** — **riwayat** rencana FAMILY OS versi Google Sheets/Apps Script; stack-nya sudah gugur, keputusan produknya tetap berlaku

---

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000 (buka browser otomatis)
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server Vite (port 3000) |
| `npm run build` | Build produksi → `dist/` |
| `npm run icons` | Buat ulang ikon PWA dari `assets/logo.png` → `public/icons/` + `public/brand/` |

Tidak ada langkah build tambahan: Tailwind diproses lewat PostCSS.

---

## Struktur

```
bayt-mustaqbal-app/
├── index.html                  # Shell: meta PWA, banner install, skip link, toast jaringan
├── main.jsx                    # Mount React + registrasi service worker (produksi saja)
├── App.jsx                     # Root: state 5 section + mockData + formatter rupiah
├── App.css                     # Token & utilitas dasar (entry Tailwind)
├── components/                 # Navigation, ui.jsx (Card/StatCard/Badge/ItemActions/...),
│                               # TaskList, NoteList, Toast, FormSheet, FamilyCard, FamilyMemberCard,
│                               # ScheduleItem, Calendar, Icon
├── assets/logo.png             # Logo asli (sumber brand & ikon)
├── public/                     # Disalin apa adanya ke dist/ — WAJIB ditaruh di sini
│   ├── manifest.json           # 8 ikon "any" + 2 "maskable"
│   ├── service-worker.js       # cache-first untuk aset, network-first untuk /api/*
│   ├── brand/logo.png          # Logo ter-trim (transparan) untuk mark di app
│   └── icons/                  # 12 berkas: icon-72…512, maskable-192/512, apple-touch-icon, favicon.ico
├── scripts/generate-icons.ps1  # Generator ikon DARI logo (dipanggil npm run icons)
├── docs/                       # Riwayat: spesifikasi FAMILY OS versi Sheets/Apps Script
├── AGENT.md                    # Aturan wajib untuk agent + kondisi nyata
├── DESIGN-SYSTEM.md            # Warna, tipografi, navigasi, target sentuh
└── PROJECT_SUMMARY.md          # Rencana backend Worker + D1 (belum dibuat)
```

> **Penting:** Vite hanya menyalin folder `public/` ke `dist/`. Kalau `manifest.json`, `service-worker.js`, atau `icons/` ditaruh di root, semuanya akan 404 di produksi → install PWA dan mode offline mati.

---

## Yang sudah jalan (frontend)

- 5 section dalam satu halaman, **tanpa router** — perpindahan section lewat state
- **Mobile-first:** bottom tab bar 56 px (< 1024 px) dengan safe-area iOS, header sticky, desktop nav muncul di `lg`
- **PWA:** manifest + service worker + 12 ikon dari **logo Kakang**; service worker hanya didaftarkan di produksi
- **Banner install** muncul setelah event `beforeinstallprompt`; toast status jaringan hanya saat online/offline berubah
- **Tema High-Tech Blue:** dark navy `#0A192F` + aksen cyan `#22D3EE`, glass pada elemen kunci, glow tipis, **skala elevasi + gerak** (indikator tab menggeser, header naik elevasi saat digulir, item daftar masuk berundak), angka dengan Fira Code (lihat `DESIGN-SYSTEM.md`)
- **Layar gerbang** muncul tiap app dibuka: pilih Kakang/Istri (tersimpan di `localStorage`) — nanti menjadi layar login
- **Tambah / Ubah / Hapus item** di Agenda (Jadwal & Tugas), Keuangan, dan Catatan: form bottom sheet (mode ubah berisi nilai lama) + tombol Ubah/Hapus di tiap kartu. Hapus = langsung + **toast "Urungkan"** (6 detik, tanpa dialog)
- **Pencarian catatan** (judul + isi) di tab Catatan, di atas filter kategori
- **Dashboard baru:** kartu hero glass (pengeluaran + realisasi anggaran), aksi cepat, KPI, dan 3 chart tulis sendiri (tren 6 bulan, 7 hari, komposisi)
- **Terverifikasi** di 320 / 360 / 390 / 414 / 768 px: 0 overflow horizontal, 0 elemen interaktif di bawah 44 px

## Belum ada

| Item | Catatan |
|---|---|
| Backend & database | Rencana: Cloudflare Worker + D1 → lihat `PROJECT_SUMMARY.md` |
| Login & role | Kakang = admin, Istri = user (keputusan D1) |
| Notifikasi WA | Rencana via Fonnte (keputusan D15) |
| Data nyata | Sekarang dummy; `fetch` belum ditambahkan sama sekali |

Modul berikutnya dibangun **setelah** modul sebelumnya dipakai ± 2 minggu (prinsip di `docs/03-ROADMAP.md`) — supaya yang dibangun sesuai kebutuhan nyata, bukan asumsi.

---

## Deploy (nanti)

- **Frontend statis → Cloudflare Pages.** Build command `npm run build`, output `dist/`.
- **Backend → Cloudflare Worker + D1** (belum dibuat). Langkah `wrangler` ada di `PROJECT_SUMMARY.md`.
- Domain sasaran: `app.baytmustaqbal.my.id`.
- `.github/workflows/deploy.yml` sudah dihapus karena masih menunjuk `frontend/` + `worker/` yang tidak ada; akan ditulis ulang saat setup deploy.

---

## Lisensi

MIT — untuk keperluan pribadi/keluarga.
