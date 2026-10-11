# Bayt Mustaqbal - Cloudflare Stack

Aplikasi keluarga (keuangan, absensi, kalender, service) dibangun dengan:
- **Frontend**: React + TypeScript + Vite → Cloudflare Pages
- **Backend**: Hono + TypeScript → Cloudflare Workers
- **Database**: D1 (SQLite) → Cloudflare D1
- **Auth**: JWT (HttpOnly Cookie) + bcryptjs
- **Notifikasi**: Fonnte WhatsApp API
- **Deploy**: GitHub Actions

---

## Struktur Project

```
bayt-mustaqbal-cf/
├── worker/                    # Cloudflare Worker (Backend)
│   ├── src/
│   │   ├── index.ts          # Entry point + routes
│   │   ├── cron.ts           # Scheduled jobs (daily digest, reminders, monthly generate)
│   │   ├── routes/           # API routes per modul
│   │   │   ├── auth.ts       # Login, register, users
│   │   │   ├── transactions.ts
│   │   │   ├── bills.ts
│   │   │   ├── categories.ts
│   │   │   └── settings.ts
│   │   ├── middleware/       # Auth, validation
│   │   ├── utils/            # Auth, DB helpers
│   │   └── types/            # TypeScript types
│   ├── migrations/           # D1 schema (0001_schema, 0002_seed)
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml
├── frontend/                  # React + Vite (Frontend)
│   ├── src/
│   │   ├── App.tsx           # Routing + auth init
│   │   ├── main.tsx          # Entry point
│   │   ├── api/client.ts     # API client (fetch wrapper)
│   │   ├── stores/authStore.ts # Zustand auth state
│   │   ├── components/       # Layout, ProtectedRoute, AdminRoute
│   │   ├── pages/            # Dashboard, Login, Transactions, etc.
│   │   ├── stores/           # Zustand stores
│   │   ├── utils/helpers.ts  # Formatters, helpers
│   │   └── styles.css        # Design system (dark mode ready)
│   ├── public/manifest.json  # PWA manifest
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .github/workflows/deploy.yml # CI/CD
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Cloudflare account (free tier OK)
- Wrangler CLI: `npm install -g wrangler`

### 1. Clone & Install
```bash
cd bayt-mustaqbal-cf
cd worker && npm install
cd ../frontend && npm install
```

### 2. Setup D1 Database (Local)
```bash
cd worker
wrangler d1 create bayt-mustaqbal-db
# Copy database_id to wrangler.toml
npm run migrate
npm run migrate:create seed_data  # optional: create seed migration
```

### 3. Set Secrets (Local)
```bash
cd worker
wrangler secret put JWT_SECRET
# Enter: your-super-secret-jwt-key-min-32-chars-random

wrangler secret put FONNTE_TOKEN
# Enter: your-fonnte-api-token

wrangler secret put FONNTE_TARGET
# Enter: 628xxxxxxxxxx@g.us

wrangler secret put FONNTE_DEVICE
# Enter: default
```

### 4. Run Dev Servers
```bash
# Terminal 1: Worker
cd worker && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Frontend: `http://localhost:5173` (proxies `/api/*` to Worker)
Worker: `http://localhost:8787`

---

## Deploy ke Cloudflare

### 1. Setup Cloudflare Resources
```bash
# D1 Database (Production)
wrangler d1 create bayt-mustaqbal-db --remote
# Copy database_id ke wrangler.toml

# KV Namespace (Optional - for sessions/cache)
wrangler kv namespace create BAYT_KV --remote
wrangler kv namespace create BAYT_KV --preview --remote
# Copy IDs ke wrangler.toml
```

### 2. Set Production Secrets
```bash
wrangler secret put JWT_SECRET --remote
wrangler secret put FONNTE_TOKEN --remote
wrangler secret put FONNTE_TARGET --remote
wrangler secret put FONNTE_DEVICE --remote
```

### 3. Apply Migrations (Remote)
```bash
cd worker
npm run migrate:remote
```

### 3. GitHub Actions (Auto Deploy)
1. Push ke GitHub
2. Set GitHub Secrets:
   - `CF_ACCOUNT_ID` (dari Cloudflare dashboard)
   - `CF_API_TOKEN` (Create di Cloudflare → My Profile → API Tokens → Custom token dengan permission: Account:D1, Workers, Pages, KV)
3. Push ke `main` branch → Auto deploy via GitHub Actions

### 4. Custom Domain (Cloudflare Pages)
1. Cloudflare Pages → Project `bayt-mustaqbal` → Custom domains
2. Add `app.baytmustaqbal.my.id` (subdomain recommended)
3. DNS: CNAME `app` → `bayt-mustaqbal.pages.dev` (Proxy ON)

---

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
| GET | `/api/categories/list` | Admin | List kategori |
| POST | `/api/categories/create` | Admin | Buat kategori |
| GET | `/api/settings/get` | Admin | Semua settings |
| POST | `/api/settings/set` | Admin | Set setting (key-value) |
| POST | `/api/settings/test-wa` | Admin | Test kirim WA |

---

## Cron Jobs (Scheduled)

| Cron | Waktu | Handler |
|------|-------|---------|
| `0 7 * * *` | 07:00 WIB | Daily digest WA |
| `0 * * * *` | Setiap jam | Cek reminder tagihan |
| `30 0 1 * *` | Tgl 1 00:30 | Generate tagihan bulanan |

---

## Fonnte Setup (WhatsApp Notifikasi)

1. Daftar `fonnte.com` → Dapatkan **API Token**
2. Buat grup WA keluarga → Tambah nomor Fonnte sebagai **Admin**
3. Buka WhatsApp Web → Grup → URL: `https://web.whatsapp.com/?group=628xxx@g.us`
4. Copy Group ID (`628xxxxxxxxxx@g.us`)
5. Set di Settings Admin:
   - `fonnte_token`: API Token
   - `fonnte_target`: Group ID
   - `fonnte_device`: `default`
   - `notifikasi_channel`: `WA`
   - `jam_notifikasi`: `07:00`

---

## Migrasi dari GAS (Google Apps Script)

Jika sudah punya data di GAS/Sheets:

1. Export dari Sheets ke CSV
2. Transform CSV → SQL INSERT (gunakan script Python/Node)
3. Jalankan di D1: `wrangler d1 execute bayt-mustaqbal-db --remote --file=import.sql`

Atau gunakan API `/api/txn/bulk_create` untuk batch insert.

---

## Fitur Utama

| Modul | Fitur |
|-------|-------|
| **Dashboard** | Saldo per rekening, budget vs realisasi, tagihan terdekat/terlambat, agenda 7 hari, absensi hari ini, sisa cuti, service due |
| **Keuangan** | Input cepat grid kategori, filter + pagination, conflict detection (rev), soft delete |
| **Review** | Budget vs realisasi (horizontal bar), komposisi kategori (doughnut), trend 12 bulan, top 5, prediksi akhir bulan |
| **Tagihan** | Grouped by status, cicilan card, bayar 1 klik (txn + bill), generate dari recurring, iuran sampah dengan reminder jam |
| **Absensi** | Kalender bulanan grid chip status, quick input Hadir/Izin/Cuti/Sakit, quota cuti/izin progress bar |
| **Kalender** | Month view + Agenda view, filter kategori, toggle selesai, biaya rencana → suggest transaksi |
| **Service** | Aset (motor/rumah/elektronik), interval hari/km, riwayat + biaya kumulatif, due summary (30 hari/500km) |
| **Catatan** | Grid card, pin, search, kategori (ide/resep/referensi) |
| **Notifikasi WA** | Daily digest 07:00, reminder jam spesifik per tagihan, test WA dari settings |
| **Settings (Admin)** | CRUD kategori (drag-reorder ready), CRUD user (role), Fonnte config, trigger status, regenerate bills |

---

## Tech Stack Detail

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, React Router, Zustand, Chart.js |
| Backend | Hono, TypeScript, Cloudflare Workers |
| Database | D1 (SQLite), proper FK, indexes |
| Auth | JWT (HS256, 30d expiry), bcryptjs (cost 12), HttpOnly Cookie ready |
| Validation | Zod schemas + middleware |
| Styling | Custom CSS (CSS Variables, Dark Mode ready, Mobile-first) |
| Charts | Chart.js + react-chartjs-2 |
| Deploy | GitHub Actions → Cloudflare Pages + Workers |
| Notifications | Fonnte WhatsApp API |

---

## License

MIT License - Feel free to use for personal/family projects.