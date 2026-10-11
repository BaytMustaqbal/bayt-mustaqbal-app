# Bayt Mustaqbal - Worker (Backend API)

Cloudflare Worker backend untuk aplikasi keluarga Bayt Mustaqbal.

## Struktur

```
worker/
├── src/
│   ├── index.ts              # Entry point + routes registration
│   ├── cron.ts               # Scheduled jobs (daily digest, reminders, monthly generate)
│   ├── routes/               # API routes per modul
│   │   ├── auth.ts           # Login, register, users
│   │   ├── transactions.ts   # CRUD transaksi
│   │   ├── bills.ts          # CRUD tagihan + bayar + generate
│   │   ├── recurring.ts      # Template transaksi rutin
│   │   ├── categories.ts     # CRUD kategori (admin)
│   │   ├── attendance.ts     # Absensi + quota cuti
│   │   ├── calendar.ts       # Acara keluarga
│   │   ├── service.ts        # Aset motor/rumah + log service
│   │   ├── notes.ts          # Catatan bebas
│   │   ├── review.ts         # Analisis keuangan
│   │   ├── dashboard.ts      # Ringkasan dashboard
│   │   ├── settings.ts       # Settings admin
│   │   └── notif.ts          # Notifikasi WA via Fonnte
│   ├── middleware/           # Auth (JWT), Validation (Zod)
│   ├── utils/                # Auth (bcrypt+jose), DB helpers, Fonnte
│   └── types/                # TypeScript types
├── migrations/               # D1 schema (0001_schema, 0002_seed)
├── package.json
├── tsconfig.json
└── wrangler.toml
```

## Quick Start

```bash
cd worker
npm install

# Local D1
wrangler d1 create bayt-mustaqbal-db
# Copy database_id ke wrangler.toml
npm run migrate
npm run migrate:create seed_data

# Secrets
wrangler secret put JWT_SECRET
wrangler secret put FONNTE_TOKEN
wrangler secret put FONNTE_TARGET
wrangler secret put FONNTE_DEVICE

# Dev
npm run dev
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login email/password |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/txn/list` | Bearer | List transaksi (pagination, filter) |
| POST | `/api/txn/create` | Bearer | Buat transaksi |
| PUT | `/api/txn/update` | Bearer | Update transaksi |
| DELETE | `/api/txn/delete` | Bearer | Soft delete transaksi |
| GET | `/api/bill/list` | Bearer | List tagihan (grouped by status) |
| POST | `/api/bill/create` | Bearer | Buat tagihan |
| POST | `/api/bill/pay` | Bearer | Bayar tagihan (1 operasi) |
| POST | `/api/bill/generate` | Bearer | Generate dari recurring |
| GET | `/api/rec/list` | Bearer | List recurring |
| POST | `/api/rec/create` | Bearer | Buat recurring |
| GET | `/api/att/list` | Bearer | List absensi |
| GET | `/api/att/calendar` | Bearer | Kalender absensi grid |
| POST | `/api/att/upsert` | Bearer | Upsert absensi |
| GET | `/api/att/quota` | Bearer | Quota cuti/izin |
| GET | `/api/cal/list` | Bearer | List acara |
| POST | `/api/cal/create` | Bearer | Buat acara |
| PUT | `/api/cal/toggle_done` | Bearer | Toggle selesai |
| GET | `/api/svc/asset.list` | Bearer | List aset |
| POST | `/api/svc/asset.create` | Bearer | Buat aset |
| GET | `/api/svc/list` | Bearer | List log service |
| POST | `/api/svc/create` | Bearer | Catat service |
| GET | `/api/svc/due` | Bearer | Aset yang butuh service |
| GET | `/api/note/list` | Bearer | List catatan |
| POST | `/api/note/create` | Bearer | Buat catatan |
| GET | `/api/review/monthly` | Bearer | Review bulanan |
| GET | `/api/review/compare` | Bearer | Bandingkan bulan |
| GET | `/api/review/trend` | Bearer | Tren 12 bulan |
| GET | `/api/dash/summary` | Bearer | Dashboard summary |
| GET | `/api/categories/list` | Admin | List kategori |
| POST | `/api/categories/create` | Admin | Buat kategori |
| GET | `/api/settings/get` | Admin | Semua settings |
| POST | `/api/settings/set` | Admin | Set setting |
| POST | `/api/settings/test-wa` | Admin | Test WA |
| POST | `/api/notif/send` | Bearer | Kirim WA manual |
| POST | `/api/notif/daily_digest` | Bearer | Trigger daily digest |
| POST | `/api/notif/bill_reminder_check` | Bearer | Cek reminder tagihan |

## Cron Jobs

| Cron | Waktu | Handler |
|------|-------|---------|
| `0 7 * * *` | 07:00 WIB | Daily digest WA |
| `0 * * * *` | Setiap jam | Cek reminder tagihan |
| `30 0 1 * *` | Tgl 1 00:30 | Generate tagihan bulanan |

## Database Schema (D1)

15 tabel utama:
- `users`, `settings`, `categories`, `accounts`
- `transactions`, `recurring`, `bills`
- `attendance`, `attendance_quota`
- `calendar_events`
- `service_asset`, `service_log`
- `notes`, `audit_log`, `notification_log`

## Deploy

```bash
# Production
wrangler d1 create bayt-mustaqbal-db --remote
wrangler kv namespace create BAYT_KV --remote
# Update wrangler.toml dengan database_id & kv ids

wrangler secret put JWT_SECRET --remote
wrangler secret put FONNTE_TOKEN --remote
wrangler secret put FONNTE_TARGET --remote
wrangler secret put FONNTE_DEVICE --remote

npm run migrate:remote
npm run deploy
```

## Environment Variables (Secrets)

| Secret | Deskripsi |
|--------|-----------|
| `JWT_SECRET` | Random 32+ char untuk JWT signing |
| `FONNTE_TOKEN` | API Token dari Fonnte |
| `FONNTE_TARGET` | Group ID WA (format: 628xxx@g.us) |
| `FONNTE_DEVICE` | Device ID Fonnte (default: `default`) |

## Local Development

```bash
# Terminal 1: Worker
npm run dev

# Terminal 2: Frontend (di folder ../frontend)
npm run dev
```

Frontend: `http://localhost:5173` (proxy `/api/*` → Worker `http://localhost:8787`)
Worker: `http://localhost:8787`

## TypeScript Types

Semua tipe didefinisikan di `src/types/env.ts` dan otomatis tersedia di seluruh codebase via Hono's type inference.

## Validation

Menggunakan Zod schemas di `src/middleware/validate.ts` dengan middleware `zValidator` untuk validasi request body/query/params yang konsisten.

## Audit Log

Semua operasi create/update/delete otomatis mencatat ke tabel `audit_log` dengan detail:
- User, role, action, entity, entity_id
- Ringkasan perubahan
- Data sebelum & sesudah (JSON)

## Notifikasi WA (Fonnte)

Menggunakan Fonnte API untuk kirim WA ke grup keluarga.
- Daily digest jam 07:00
- Reminder tagihan per jam (untuk iuran sampah dll)
- Monthly generate notifikasi
- Test WA dari Settings admin