# AGENT.md - Bayt Mustaqbal Project

## Project Overview

**Bayt Mustaqbal** (بَيْت الْمُسْتَقْبَل) = "Rumah Masa Depan"
Aplikasi keluarga untuk keuangan, absensi, kalender, dan service motor/rumah.

**Stack:**
- Frontend: React 18 + TypeScript + Vite → Cloudflare Pages
- Backend: Hono + TypeScript → Cloudflare Workers
- Database: D1 (SQLite) → Cloudflare D1
- Auth: JWT (HS256) + bcryptjs (cost 12)
- Notifikasi: Fonnte WhatsApp API
- Deploy: GitHub Actions → Cloudflare Pages + Workers

---

## Project Structure

```
bayt-mustaqbal-app/
├── worker/                      # Cloudflare Worker (Backend API)
│   ├── src/
│   │   ├── index.ts             # Entry point + 15 routes registration
│   │   ├── cron.ts              # 3 scheduled jobs (daily, hourly, monthly)
│   │   ├── routes/              # 15 API modules
│   │   │   ├── auth.ts          # Login, register, users
│   │   │   ├── transactions.ts  # CRUD transaksi + conflict detection
│   │   │   ├── bills.ts         # CRUD tagihan + bayar + generate
│   │   │   ├── recurring.ts     # Template transaksi rutin
│   │   │   ├── categories.ts    # CRUD kategori (admin)
│   │   │   ├── attendance.ts    # Absensi + quota cuti
│   │   │   ├── calendar.ts      # Acara keluarga
│   │   │   ├── service.ts       # Aset motor/rumah + log service
│   │   │   ├── notes.ts         # Catatan bebas
│   │   │   ├── review.ts        # Analisis keuangan
│   │   │   ├── dashboard.ts     # Ringkasan dashboard
│   │   │   ├── settings.ts      # Settings admin
│   │   │   └── notif.ts         # Notifikasi WA via Fonnte
│   │   ├── middleware/          # Auth (JWT) + Validation (Zod)
│   │   ├── utils/               # Auth, DB, Fonnte helpers
│   │   └── types/env.ts         # TypeScript bindings
│   ├── migrations/              # 0001_schema.sql + 0002_seed.sql
│   ├── wrangler.toml            # D1, KV, Cron, Secrets config
│   └── package.json
├── frontend/                     # React + Vite (PWA ready)
│   ├── src/
│   │   ├── App.tsx              # Routing + Auth init + Protected/Admin routes
│   │   ├── main.tsx             # Entry point
│   │   ├── api/client.ts        # API client (fetch wrapper)
│   │   ├── stores/authStore.ts  # Zustand persist (token, user, role)
│   │   ├── components/          # Layout, ProtectedRoute, AdminRoute
│   │   ├── pages/               # 11 pages lengkap
│   │   ├── stores/              # Zustand stores
│   │   ├── utils/helpers.ts     # Formatters, date, rupiah
│   │   └── styles.css           # Design system (dark mode, mobile-first)
│   ├── public/manifest.json     # PWA manifest
│   ├── vite.config.ts           # Proxy /api → Worker
│   └── package.json
├── .github/workflows/deploy.yml # CI/CD Pipeline
├── docs/                        # Dokumentasi perencanaan
│   ├── 01-ARSITEKTUR-DATA.md    # 15 tabel schema + relasi
│   ├── 02-SPESIFIKASI-MODUL.md  # 11 modul + kontrak API
│   ├── 03-ROADMAP.md            # Fase 0-4 + kriteria selesai
│   ├── 04-KEPUTUSAN-TERKUNCI.md # 16 keputusan + alasan
│   └── SETUP-FONNTE.md          # Panduan setup Fonnte step-by-step
├── PROJECT_SUMMARY.md           # Ringkasan teknis lengkap
└── README.md                    # Root documentation
```

---

## Key Technical Decisions (16 Keputusan Terkunci)

| ID | Keputusan | Alasan |
|----|-----------|--------|
| D1 | Admin (Kakang) + User (Istri) | Role-based access, Istri view+input only |
| D2 | Single Web App + Hash routing | 1 URL, konsisten, easy maintenance |
| D3 | WA only (Fonnte), no email | Higher read rate, simpler |
| D4 | Google Sheets → D1 migration | Better query, concurrency, proper FK |
| D5 | 1 tab `calendar_events` + kategori | No data fragmentation |
| D6 | `recurring` ≠ `bills` ≠ `transactions` | Data integrity, audit trail |
| D7 | Vanilla JS + Hono, no build step | Zero config, portable |
| D8 | System fonts only | Performance, no FOIT |
| D9 | Edit 24 jam only | Audit trail protection |
| D10 | 2 deploy versions (dev/prod) | Safe deployment |
| D11 | Rekening aktif dari Fase 1 | Saldo per rekening real-time |
| D12 | No photo upload (manual only) | Simplicity, avoid complexity |
| D13 | Tagihan variabel = estimasi + edit | Accuracy, no phantom numbers |
| D14 | Hari libur hardcode di settings | Zero dependency |
| D15 | WA only via Fonnte | Cost-effective, readable |
| D16 | Iuran sampah = bill type khusus | Special reminder with jam |

---

## Database Schema (15 Tabel D1)

| Tabel | Deskripsi | Key Columns |
|-------|-----------|-------------|
| `users` | Pengguna + role | user_id, email, nama, role, aktif |
| `settings` | Key-value config | k, v, tipe |
| `categories` | Master kategori | category_id, nama, tipe, scope, budget_bulanan |
| `accounts` | Rekening/e-wallet | account_id, nama, tipe, saldo_awal |
| `transactions` | Transaksi keuangan | txn_id, tanggal, tipe, kategori_id, jumlah, account_id |
| `recurring` | Template rutin | rec_id, frekuensi, hari_tanggal, auto_post |
| `bills` | Tagihan real | bill_id, tipe, jatuh_tempo, status, remind_at |
| `attendance` | Absensi kerja | att_id, tanggal, nama, status, terjadwal |
| `attendance_quota` | Jatah cuti/izin | tahun, nama, jatah_cuti, jatah_izin |
| `calendar_events` | Acara keluarga | event_id, kategori, tanggal_mulai/selesai |
| `service_asset` | Aset motor/rumah | asset_id, grup, interval_hari/km |
| `service_log` | Riwayat service | svc_id, asset_id, jenis, kilometer, biaya |
| `notes` | Catatan bebas | note_id, judul, isi, kategori, pin |
| `audit_log` | Jejak perubahan | log_id, email, aksi, entity, sebelum/sesudah |
| `notification_log` | Log notifikasi | notif_id, tipe, status, error |

**Aturan Wajib:**
- Semua query **WAJIB** pakai nama header, BUKAN indeks kolom
- Semua operasi tulis **WAJIB** dibungkus `LockService`
- Soft delete: kolom `void` (YA/TIDAK), jangan hard delete
- Kolom `rev` untuk optimistic locking (conflict detection)

---

## API Contract

**Base URL:** `/api`

**Response Format:**
```json
{ "ok": true, "data": {...}, "error": null }
{ "ok": false, "data": null, "error": { "code": "VALIDATION", "message": "...", "details": {} } }
```

**Error Codes:**
- `UNAUTHENTICATED` - Token invalid/expired
- `FORBIDDEN` - Role tidak cukup
- `VALIDATION` - Input tidak valid (details per field)
- `NOT_FOUND` - Resource tidak ditemukan
- `CONFLICT` - Rev mismatch (concurrent edit)
- `LOCK_TIMEOUT` - Sheet busy > 30s
- `SERVER` - Unexpected error

**Auth:** Bearer token (JWT HS256, 30d expiry)

---

## 11 Modul & Endpoints

| Modul | Prefix | Key Endpoints |
|-------|--------|---------------|
| Auth | `/api/auth` | `login`, `me`, `register`, `users` |
| Transactions | `/api/txn` | `list`, `create`, `update`, `delete` |
| Bills | `/api/bill` | `list`, `create`, `pay`, `generate` |
| Recurring | `/api/rec` | `list`, `create`, `update`, `delete` |
| Categories | `/api/categories` | `list`, `create`, `update`, `delete`, `reorder` |
| Attendance | `/api/att` | `list`, `calendar`, `upsert`, `quota` |
| Calendar | `/api/cal` | `list`, `create`, `toggle_done`, `delete` |
| Service | `/api/svc` | `asset.list`, `asset.create`, `list`, `create`, `due` |
| Notes | `/api/note` | `list`, `create`, `update`, `delete` |
| Review | `/api/review` | `monthly`, `compare`, `by_category`, `trend` |
| Dashboard | `/api/dash` | `summary` |
| Settings | `/api/cfg` | `get`, `set`, `test-wa`, `triggers` |
| Notifications | `/api/notif` | `send`, `daily_digest`, `bill_reminder_check`, `test` |

---

## Cron Jobs (Scheduled Triggers)

| Cron | Waktu | Handler | Fungsi |
|------|-------|---------|--------|
| `0 7 * * *` | 07:00 WIB | `handleDailyDigest` | Daily digest WA ke grup |
| `0 * * * *` | Setiap jam | `handleBillReminders` | Cek `bills.remind_at` ≤ now |
| `30 0 1 * *` | Tgl 1 00:30 | `handleMonthlyGenerate` | Generate tagihan dari `recurring` |

---

## Frontend Architecture

**State Management:**
- **Zustand** untuk auth state (token, user, role) + persist ke localStorage
- React hooks untuk local component state
- No React Query - fetch manual via API client

**Routing:**
- React Router 6 + Hash routing (`#/keuangan`, `#/tagihan`, dll)
- `ProtectedRoute` - redirect ke `/login` kalau belum auth
- `AdminRoute` - hanya role `admin` bisa akses `/settings`

**API Client (`src/api/client.ts`):**
- Wrapper fetch + Bearer token auto-attach
- Auto redirect ke `/login` kalau 401
- Promise-based, error handling terpusat

**Styling:**
- Custom CSS Variables (design tokens)
- Dark mode ready (`prefers-color-scheme`)
- Mobile-first responsive
- No CSS framework - pure CSS, lightweight

---

## Development Commands

```bash
# Worker (Backend)
cd worker
npm install
npm run dev              # wrangler dev (local)
npm run deploy           # wrangler deploy (production)
npm run migrate          # Local D1 migration
npm run migrate:remote   # Remote D1 migration
npm run typecheck        # tsc --noEmit

# Frontend
cd frontend
npm install
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build → ./dist
npm run preview          # Preview build
```

---

## Local Development Setup

### 1. Worker (Backend)
```bash
cd worker
npm install

# Local D1
wrangler d1 create bayt-mustaqbal-db
# Copy database_id ke wrangler.toml
npm run migrate
npm run migrate:create seed_data

# Secrets (local)
wrangler secret put JWT_SECRET
wrangler secret put FONNTE_TOKEN
wrangler secret put FONNTE_TARGET
wrangler secret put FONNTE_DEVICE

# Run dev
npm run dev  # http://localhost:8787
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173 (proxy /api → localhost:8787)
```

### 3. Test Login
- Email: `kakang@email.com` (admin) / `istri@email.com` (user)
- Password: apa saja (seed tidak set password hash, butuh register via API atau set manual di D1)

---

## 4 Secret yang Harus Di-set (Cloudflare Dashboard)

| Secret | Contoh | Cara Dapat |
|--------|--------|------------|
| `JWT_SECRET` | `openssl rand -base64 32` | Generate random 32+ char |
| `FONNTE_TOKEN` | `abc123...` | Dashboard fonnte.com → API Token |
| `FONNTE_TARGET` | `6281234567890@g.us` | WhatsApp Web → Grup → URL |
| `FONNTE_DEVICE` | `default` | Atau Device ID dari Fonnte |

---

## Fonnte Setup (5 Menit)

1. Daftar `fonnte.com` → dapatkan **API Token**
2. Buat grup WA keluarga → tambah nomor Fonnte sebagai **Admin**
3. Buka WhatsApp Web → grup → URL `https://web.whatsapp.com/?group=628xxx@g.us` → copy **Group ID**
4. Settings Admin → isi Token, Target, Device → **Test Kirim WA**

---

## Deploy ke Production

```bash
# 1. Cloudflare Resources
wrangler d1 create bayt-mustaqbal-db --remote
wrangler kv namespace create BAYT_KV --remote
# Update wrangler.toml dengan database_id & kv ids

# 2. Secrets Remote
wrangler secret put JWT_SECRET --remote
wrangler secret put FONNTE_TOKEN --remote
wrangler secret put FONNTE_TARGET --remote
wrangler secret put FONNTE_DEVICE --remote

# 4. Migrate & Deploy
npm run migrate:remote
npm run deploy

# 5. GitHub Actions (Auto)
# GitHub Secrets: CF_ACCOUNT_ID, CF_API_TOKEN
# Push ke main → Auto deploy
```

---

## Custom Domain (Cloudflare Pages)

1. Cloudflare Pages → Project `bayt-mustaqbal` → Custom domains
2. Add `app.baytmustaqbal.my.id` (subdomain recommended)
3. DNS: CNAME `app` → `bayt-mustaqbal.pages.dev` (Proxy ON)

---

## Documentation Files

| File | Deskripsi |
|------|-----------|
| `README.md` | Root documentation + quick start |
| `PROJECT_SUMMARY.md` | Ringkasan teknis lengkap |
| `worker/README.md` | Backend API docs |
| `frontend/README.md` | Frontend docs |
| `docs/01-ARSITEKTUR-DATA.md` | 15 tabel schema + relasi |
| `docs/02-SPESIFIKASI-MODUL.md` | 11 modul + kontrak API |
| `docs/03-ROADMAP.md` | Fase 0-4 + kriteria selesai |
| `docs/04-KEPUTUSAN-TERKUNCI.md` | 16 keputusan + alasan |
| `docs/SETUP-FONNTE.md` | Panduan setup Fonnte step-by-step |

---

## Common Tasks for Agents

### Add New API Endpoint
1. Create route file di `worker/src/routes/`
2. Register di `worker/src/index.ts` → `app.route('/api/xxx', routes)`
2. Add types di `worker/src/types/env.ts` jika perlu
3. Add frontend API call di `frontend/src/api/client.ts`
4. Create page/component di frontend

### Add New Database Column
1. Buat migration baru: `npm run migrate:create add_column_xxx`
2. Edit file SQL di `worker/migrations/`
4. Run `npm run migrate` (local) / `npm run migrate:remote` (prod)
5. Update TypeScript types di `types/env.ts`
6. Update frontend types jika perlu

### Add New Frontend Page
1. Create `frontend/src/pages/NewPage.tsx`
2. Add route di `frontend/src/App.tsx`
3. Add menu item di `frontend/src/components/Layout.tsx`
4. Add API calls di `frontend/src/api/client.ts`

### Debug Tips
- Worker logs: `wrangler tail` (production) / console.log di `wrangler dev`
- Frontend: React DevTools + Network tab
- D1 queries: `wrangler d1 execute bayt-mustaqbal-db --remote --command="SELECT ..."`
- D1 local: `wrangler d1 execute bayt-mustaqbal-db --local --command="SELECT ..."`

---

## Important Reminders

1. **NEVER** use column index in queries - always use header names
2. **ALWAYS** wrap writes in `LockService` (handled by `withLock_` helper)
3. **NEVER** hard delete - use soft delete (`void = 'YA'`)
4. **ALWAYS** check `rev` for concurrent edits
5. **NEVER** commit secrets - use `wrangler secret put`
6. **ALWAYS** test locally with `wrangler dev` before deploy
7. **ALWAYS** run typecheck (`npm run typecheck`) before commit

---

## Contact / Context

**Project Owner:** Kakang (Rezki Yudi Triana)
**Target Users:** Kakang + Istri (2 users)
**Project Name:** Bayt Mustaqbal (بَيْت الْمُسْتَقْبَل) = "Rumah Masa Depan"
**Vision:** Satu aplikasi untuk semua kebutuhan keluarga: keuangan, absensi, kalender, service.

---

*Generated for AI agents working on Bayt Mustaqbal project.*
*Last updated: 2026-10-11*