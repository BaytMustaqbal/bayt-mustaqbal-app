# Bayt Mustaqbal — Manajemen Keluarga

Web app keluarga untuk **2 pengguna**: Kakang (admin) + Istri.
Isi sekarang: 5 section — Dashboard, Agenda (Jadwal/Tugas/Kalender/Timeline), Keuangan, Keluarga, Catatan.

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
├── index.html                  # Shell: meta PWA, popup "Pasang app", skip link, toast jaringan, skrip boot tema (anti-kedip)
├── main.jsx                    # Mount React + registrasi service worker (produksi saja)
├── App.jsx                     # Root: state 5 section + mockData + formatter rupiah + state tema (Sistem/Terang/Gelap)
├── App.css                     # Token DUA TEMA (gelap & terang) & utilitas dasar (entry Tailwind)
├── components/                 # Navigation, ui.jsx (Card/StatCard/Badge/Avatar/ItemActions/...),
│                               # TaskList, NoteList, Toast, FormSheet, AccountModal, FamilyCard, FamilyMemberCard,
│                               # ScheduleItem, Calendar, Icon, charts.jsx, notifications.js
│                               # + categories.js (kategori & keranjang anggaran), budget.js (logika 50/30/20 murni),
│                               #   Budgeting.jsx (halaman Anggaran / sub-tab Keuangan), Dashboard.jsx, Timeline.jsx
├── assets/logo.png             # Logo asli (sumber brand & ikon)
├── assets/profile-rezki.jpg    # Foto asli Kakang (500×500) — sumber foto profil contoh
├── public/                     # Disalin apa adanya ke dist/ — WAJIB ditaruh di sini
│   ├── manifest.json           # 8 ikon "any" + 2 "maskable"
│   ├── service-worker.js       # cache-first untuk aset, network-first untuk /api/*
│   ├── brand/logo.png          # Logo ter-trim (transparan) untuk mark di app
│   ├── avatars/profile-rezki.jpg  # Foto profil contoh 256px (seed avatar Kakang)
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
- **Popup "Pasang app"**: satu-satunya titik masuk pasang — muncul setelah event `beforeinstallprompt` **dan** setelah pengguna melewati gerbang, tampil 5 detik lalu hilang sendiri (muncul lagi tiap app dibuka, berhenti permanen setelah terpasang); toast status jaringan hanya saat online/offline berubah
- **Tema High-Tech Blue — gelap & terang:** navy `#0A192F` + aksen cyan `#22D3EE` (gelap, default) atau keluarga cyan versi lebih dalam di atas latar terang `#F2FAFD`. Pilihan **Sistem / Terang / Gelap** (ikut pengaturan perangkat atau dipilih manual), tersimpan di perangkat, tombol cepat di header + pengaturan lengkap di modal "Akun saya". Ganti tema **tanpa kedip** (disetel sebelum app tampil) dan **tanpa memuat ulang**. Glass pada elemen kunci, glow tipis di gelap, **skala elevasi + gerak** (indikator tab menggeser, header naik elevasi saat digulir, item daftar masuk berundak), angka dengan Fira Code (lihat `DESIGN-SYSTEM.md` §2). Catatan jujur: **ikon & splash PWA tetap navy** karena manifest hanya punya satu warna
- **Layar gerbang** muncul tiap app dibuka: pilih Kakang/Istri (tersimpan di `localStorage`) — nanti menjadi layar login
- **Foto profil contoh:** user Kakang sudah punya foto (seed `/avatars/profile-rezki.jpg`) — tampil di chip header, kartu pengguna layar gerbang, kartu anggota Keluarga "Rezki YT", dan pratinjau modal "Akun saya"; berkas aslinya ada di `assets/profile-rezki.jpg`. Ganti/hapus foto lewat modal Akun (kembali ke inisial bila dihapus)
- **Akun saya (chip pengguna di pojok kanan atas):** modal di tengah layar untuk ganti **foto profil** (dikecilkan otomatis ke 256 px, disimpan di perangkat), **nama**, **username** (dicek unik, tampil `@username` di gerbang), **password**, dan **tampilan** (Sistem/Terang/Gelap) — plus tombol "Ganti pengguna". Catatan jujur: belum ada server, jadi password **hanya disimpan di perangkat dan belum diverifikasi** (dinyatakan terang di dalam modal)
- **Tambah / Ubah / Hapus item** di Agenda (Jadwal & Tugas), Keuangan, dan Catatan: form bottom sheet (mode ubah berisi nilai lama) + tombol Ubah/Hapus di tiap kartu. Hapus = langsung + **toast "Urungkan"** (6 detik, tanpa dialog). Form **pengeluaran** juga punya pilihan **Keranjang** anggaran (default "Otomatis (ikut kategori)")
- **Modul Anggaran 50/30/20** (sub-tab **Pengeluaran | Anggaran** di Keuangan): isi gaji → otomatis dibagi **Kebutuhan 50% / Keinginan 30% / Tabungan & Utang 20%** (rasio bisa diubah, syaratnya jumlah tepat 100%; ada tombol pintas "Pakai 50/30/20"). **Realisasi** tiap keranjang dihitung dari pengeluaran nyata — tiap pengeluaran punya keranjang (otomatis dari kategori, atau ditimpa manual per item), lengkap dengan status **Aman / Hati-hati / Lebih** + sisa per keranjang. Tiap keranjang punya daftar **pos saran** yang bisa ditambah/ubah/dihapus/dipindah keranjang — hanya label, nominalnya selalu turunan rasio (tidak disimpan). Satu bulan aktif; angka lain dihitung, bukan disimpan. **Aman** untuk data lama: kalau `localStorage` masih berisi snapshot versi sebelumnya (dengan `budget.total`), halaman tetap jalan dan memakai angka itu
- **Pencarian catatan** (judul + isi) di tab Catatan
- **Filter kategori/golongan** lewat dropdown di tab bawah (atau pill nav di desktop): Agenda, Keuangan, Keluarga & Catatan. Filter aktif terbaca di judul tiap bagian; chip di dalam section dihapus karena hanya menduplikasi dropdown. Kategori Keuangan kini 9 (ditambah **Rumah & Cicilan**, **Hiburan & Liburan**, **Tabungan & Utang**) supaya cocok dengan pembagian anggaran
- **Dashboard baru:** kartu hero glass (pengeluaran + realisasi anggaran) dengan **tombol mata** — jumlah uang tersembunyi secara default ("Rp ••••••") dan bisa ditampilkan/disembunyikan sekali ketuk; aksi cepat, KPI, dan 2 chart tulis sendiri (tren 6 bulan + donat komposisi) — **garis tren bisa diketuk** untuk lihat nilai tiap bulan (nilai total donat sudah tampil di tengah); di bawahnya panel **"Pengeluaran Terbaru"**, lalu **kartu "Timeline Agenda" ringkas** — cuplikan alur hari ini + 2 hari berikutnya, dengan tombol **"Lihat semua"** yang membawa ke alur penuh di tab Agenda
- **Notifikasi dalam app (lonceng pojok kanan atas):** isinya **dihitung dari data** — anggaran hampir/terlewati, tugas mendekati atau melewati jatuh tempo, agenda terdekat, pengeluaran terbesar. Badge angka = yang belum dibaca, ada "Tandai semua dibaca" (status tersimpan di `localStorage`); ketuk item → lompat ke bagian terkait + filternya ikut disetel. Turunan data (bukan pesan statis) jadi tidak pernah basi dan tidak butuh backend
- **Kalender keluarga & Timeline** (dua mode di tab Agenda): Kalender = grid Minggu/Bulan/Tahun dengan warna per anggota + daftar agenda hari terpilih; **Timeline** = satu alur kronologis gabungan **agenda + tugas + pengeluaran + catatan** (rel + titik per hari), dibaca dari hari ini ke depan lalu blok **Riwayat**, ada chip filter jenis. Ketuk baris mana pun → sheet "Ubah" modul asalnya. Catatan jujur: catatan diletakkan pada tanggal terakhir diubah (belum ada tanggal pembuatan) → berlabel **"Catatan diperbarui"**
- **Terverifikasi** di 320 / 360 / 390 / 414 / 768 px: 0 overflow horizontal, 0 elemen interaktif di bawah 44 px; **tema terang & gelap** diperiksa: kontras teks 27/27 lolos (WCAG ≥ 4,5:1), titik anggota 5/5 ≥ 3:1, 0 sisa warna tema gelap di seluruh layar/panel, konsol 0 error

## Belum ada

| Item | Catatan |
|---|---|
| Backend & database | Rencana: Cloudflare Worker + D1 → lihat `PROJECT_SUMMARY.md` |
| Login & role | Kakang = admin, Istri = user (keputusan D1). Profil akun (nama/username/avatar/password) sudah bisa diubah, tetapi **password belum diverifikasi** — menunggu auth sungguhan |
| Notifikasi WA | Kirim ke WhatsApp — rencana via Fonnte (keputusan D15). Notifikasi **di dalam app** (lonceng) sudah jalan, isinya turunan data |
| Data nyata | Sekarang dummy; `fetch` belum ditambahkan sama sekali |

Modul berikutnya dibangun **setelah** modul sebelumnya dipakai ± 2 minggu (prinsip di `docs/03-ROADMAP.md`) — supaya yang dibangun sesuai kebutuhan nyata, bukan asumsi.

---

## Deploy (nanti)

- **Frontend statis → Cloudflare Pages.** Build command `npm run build`, output `dist/`.
- **Backend → Cloudflare Worker + D1** (belum dibuat). Langkah `wrangler` ada di `PROJECT_SUMMARY.md`.
- Domain sasaran: `app.baytmustaqbal.my.id`.
- **Bungkus app (Capacitor)** → Android/iOS, dikerjakan **setelah** pengembangan selesai (keputusan D25). Selama pengembangan tetap PWA; Capacitor hanya kanal tambahan.
- `.github/workflows/deploy.yml` sudah dihapus karena masih menunjuk `frontend/` + `worker/` yang tidak ada; akan ditulis ulang saat setup deploy.

---

## Lisensi

MIT — untuk keperluan pribadi/keluarga.
