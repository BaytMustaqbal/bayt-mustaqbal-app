# Bayt Mustaqbal — Rencana Backend (Cloudflare Worker + D1)

> **STATUS — 12 Okt 2026: RENCANA, BELUM DIBUAT.**
> Tidak ada satu baris pun kode `worker/` di repo ini sekarang. Frontend sudah jalan di root repo
> dengan **data dummy**; backend menyusul setelah frontend dirasa cukup oleh pemakai nyata.
>
> Yang masih berguna dari sini: **15 tabel D1, daftar endpoint, cron, secret, setup Fonnte, dan
> keputusan terkunci D1–D16.** Kolom "catatan" menandai keputusan yang sudah berubah.

---

## Sasaran Stack

| Layer | Teknologi | Status |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind (PostCSS), PWA | ✅ sudah jalan |
| Backend | Hono + Cloudflare Workers | ⏳ rencana |
| Database | Cloudflare D1 (SQLite) | ⏳ rencana |
| Auth | JWT (HS256) + bcryptjs, HttpOnly cookie | ⏳ rencana |
| Notifikasi | Fonnte WhatsApp API | ⏳ rencana |
| Deploy | Cloudflare Pages (frontend) + Worker (backend) | ⏳ rencana |

---

## Rencana Struktur

```
bayt-mustaqbal-app/
├── index.html, main.jsx, App.jsx, App.css, components/, public/   # frontend — SUDAH ADA
├── worker/                                                       # RENCANA, belum dibuat
│   ├── src/
│   │   ├── index.ts            # Entry point + routing
│   │   ├── cron.ts             # Scheduled jobs (digest, reminder, generate bulanan)
│   │   ├── routes/             # Route API per modul
│   │   ├── middleware/         # Auth JWT + validasi
│   │   ├── utils/              # Helper auth, DB, Fonnte
│   │   └── types/env.ts        # Binding (D1, KV, secret)
│   ├── migrations/             # 0001_schema.sql, 0002_seed.sql
│   ├── wrangler.toml
│   └── package.json
└── PROJECT_SUMMARY.md          # berkas ini
```

> **Kode worker lama masih tersimpan di riwayat git** (commit `15f51a2`) — bisa dibaca atau
> dipulihkan tanpa menulis ulang: `git show 15f51a2:worker/src/index.ts`,
> `git show 15f51a2:worker/migrations/0001_initial_schema.sql`, dst.

---

## Skema D1 (15 Tabel)

```sql
users, settings, categories, accounts,
transactions, recurring, bills,
attendance, attendance_quota,
calendar_events,
service_asset, service_log,
notes, audit_log, notification_log
```

Aturan yang dipertahankan dari perencanaan sebelumnya:

- **Soft delete** pakai kolom `void` (data keuangan tidak dihapus fisik) — belum ada kode, jadi baris ini belum bisa dijalankan
- **`rev`** untuk deteksi konflik (dua orang mengedit baris yang sama)
- Query pakai **nama kolom**, bukan indeks
- Indexes untuk query yang sering dipakai

---

## Rencana API

| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/api/auth/login` | publik | Login email/password |
| GET | `/api/auth/me` | login | User aktif |
| GET/POST/PUT/DELETE | `/api/txn/*` | login | Transaksi (list, create, update, soft delete) |
| GET/POST | `/api/bill/*` | login | Tagihan (list, create, pay, generate dari recurring) |
| GET/POST | `/api/categories/*` | admin | Kategori |
| GET/POST | `/api/settings/*` | admin | Settings + test kirim WA |
| | `/api/rec/*`, `/api/att/*`, `/api/cal/*`, `/api/svc/*`, `/api/note/*`, `/api/review/*`, `/api/dash/*` | login | Modul lainnya |
| | `/api/audit` | admin | Jejak audit |

Bentuk balasan yang disepakati (dari `docs/02-SPESIFIKASI-MODUL.md`, tetap dipakai):

```json
{ "ok": true,  "data": { }, "error": null }
{ "ok": false, "data": null, "error": { "code": "FORBIDDEN", "message": "..." } }
```

Kode error standar: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `SERVER`.

---

## Rencana Cron

| Jadwal | Waktu | Tugas |
|---|---|---|
| `0 7 * * *` | 07:00 WIB | Digest harian via WA |
| `0 * * * *` | tiap jam | Cek reminder tagihan (termasuk iuran sampah) |
| `30 0 1 * *` | tgl 1, 00:30 | Generate tagihan bulanan dari `recurring` |

---

## Secret (belum di-set)

| Secret | Isi | Cara dapat |
|---|---|---|
| `JWT_SECRET` | kunci acak ≥ 32 karakter | generate acak |
| `FONNTE_TOKEN` | token API | dashboard fonnte.com |
| `FONNTE_TARGET` | ID grup WA, mis. `628xxx@g.us` | URL grup di WhatsApp Web |
| `FONNTE_DEVICE` | `default` atau Device ID | dashboard Fonnte |

Set lewat `wrangler secret put <NAMA>` — **jangan** pernah masuk ke repo.

---

## Setup Fonnte (untuk nanti)

1. Daftar di fonnte.com → ambil **API Token**
2. Buat grup WA keluarga → jadikan nomor Fonnte **Admin**
3. Buka WhatsApp Web → grup → ambil **Group ID** (`628xxx@g.us`)
4. Simpan sebagai secret, lalu uji kirim dari halaman Settings admin

Detail langkah: `docs/SETUP-FONNTE.md` (catatan status di berkas itu juga berlaku).

---

## Keputusan Terkunci D1–D16

| ID | Keputusan | Catatan |
|---|---|---|
| D1 | Kakang = admin, Istri = user | tetap berlaku |
| D2 | Satu web app + navigasi tab | ✅ app sekarang: satu halaman, 5 section. Hash routing belum dipakai (state in-file) |
| D3 | WA saja (Fonnte), tanpa email | tetap berlaku |
| D4 | Google Sheets → D1 | tetap berlaku — malah makin relevan |
| D5 | Satu tabel `calendar_events` + kategori | tetap berlaku |
| D6 | `recurring` ≠ `bills` ≠ `transactions` | tetap berlaku — inti integritas data |
| D7 | ~~Vanila JS, tanpa build step~~ | **DIGANTIKAN:** frontend React 18 + Vite + Tailwind, build via npm. Backend tetap Hono di Worker |
| D8 | ~~System font saja~~ | **DIGANTIKAN:** Plus Jakarta Sans |
| D9 | Edit hanya dalam 24 jam | tetap berlaku (belum diimplementasi) |
| D10 | Dua versi deploy (dev/prod) | menyesuaikan: preview + produksi Cloudflare |
| D11 | Rekening aktif sejak Fase 1 | tetap berlaku |
| D12 | Tanpa upload foto | tetap berlaku |
| D13 | Tagihan variabel = estimasi + edit saat bayar | tetap berlaku |
| D14 | Hari libur hardcode di settings | tetap berlaku |
| D15 | WA saja via Fonnte | tetap berlaku |
| D16 | Iuran sampah = tipe tagihan khusus + reminder jam | tetap berlaku |

Ringkasan keputusan beserta alasannya ada di `docs/04-KEPUTUSAN-TERKUNCI.md`.

---

## Urutan Pengerjaan

Prinsip: **jangan bangun modul yang belum dipakai 2 minggu.** Requirement yang muncul setelah
pemakaian nyata jauh lebih tajam daripada yang diasumsikan sekarang.

| Fase | Isi |
|---|---|
| 1 | **Keuangan** dulu: kategori, transaksi, tagihan, recurring, dashboard → dipakai setiap hari |
| 1.5 | Pakai ± 2 minggu, catat permintaan perbaikan |
| 2 | Absensi & kalender |
| 3 | Service aset & review/grafik |
| 4 | Polish: catatan, budget, snapshot, PWA lanjutan |

Rincian per fase: `docs/03-ROADMAP.md` (ingat: bagian stack di sana sudah tidak berlaku).
