# Bayt Mustaqbal — Backend D1 Design Spec

> **Status:** SPEC, belum diimplementasi.
> **Tanggal:** 2026-10-19
> **Stack:** Hono + Cloudflare Workers + D1 (SQLite)
> **Domain:** `api.baytmustaqbal.my.id`

---

## 1. Overview

Backend untuk Bayt Mustaqbal app (React 18 + Vite + Tailwind PWA). Menggantikan data dummy (`mockData`) dengan data nyata di Cloudflare D1.

**Goals:**
- Semua modul sekaligus (15 tabel, semua endpoint, cron, notifikasi WA)
- Data mulai dari 0 (tidak ada seed mockData)
- Auth: JWT (HS256) + bcryptjs, HttpOnly cookie
- Frontend integrate nanti (backend dulu)

**Non-Goals:**
- Google Calendar sync (tunda, catat untuk reminder)
- Frontend integrasi (nanti, setelah backend stable)
- Upload foto (D12: tanpa upload foto)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (app.baytmustaqbal.my.id)                     │
│  React 18 + Vite + Tailwind PWA                         │
│  fetch('https://api.baytmustaqbal.my.id/api/*')        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (CORS: allow app.baytmustaqbal.my.id)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Worker (api-bayt-mustaqbal)                            │
│  Hono + Cloudflare Workers                             │
│  - Auth middleware (JWT + bcrypt)                       │
│  - CORS middleware                                      │
│  - Routes (auth, txn, bill, categories, settings,       │
│    rec, att, cal, svc, note, review, dash, audit)       │
│  - Cron (digest, reminder, generate bulanan)            │
│  - Notifikasi WA (Fonnte)                               │
└──────────────────────┬──────────────────────────────────┘
                       │ D1 binding
                       ▼
┌─────────────────────────────────────────────────────────┐
│  D1 Database (bayt-mustaqbal-db)                        │
│  15 tabel (users, settings, categories, accounts,       │
│  transactions, recurring, bills, attendance,            │
│  attendance_quota, calendar_events, service_asset,      │
│  service_log, notes, audit_log, notification_log)       │
└─────────────────────────────────────────────────────────┘
```

**Keputusan arsitektur:**
- **Framework:** Hono (routing, middleware, validation)
- **Database:** D1 (SQLite) via binding `DB`
- **Auth:** JWT HS256 + bcryptjs, HttpOnly cookie (`Secure`, `SameSite=Lax`, `Max-Age=7d`)
- **CORS:** `Access-Control-Allow-Origin: https://app.baytmustaqbal.my.id`, `Allow-Credentials: true`
- **Subdomain:** `api.baytmustaqbal.my.id` (CNAME → Worker, Proxied)

---

## 3. Schema D1 (15 Tabel)

### Aturan Umum
- **Soft delete:** kolom `void` (timestamp, NULL = aktif)
- **Rev:** kolom `rev` (integer, auto-increment untuk deteksi konflik)
- **Query:** pakai nama kolom (bukan indeks)
- **Indexes:** untuk query sering (user_id, date, status)
- **Timestamps:** `created_at`, `updated_at` (ISO 8601)

### 3.1 users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- UUID
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,   -- bcrypt hash
  nama TEXT NOT NULL,
  avatar_url TEXT,               -- NULL = inisial
  role TEXT NOT NULL DEFAULT 'user',  -- admin | user
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT                      -- soft delete
);
```

### 3.2 settings
```sql
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,           -- JSON string
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT,
  UNIQUE(user_id, key)
);
```

### 3.3 categories
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,            -- agenda | keuangan | keluarga | catatan
  icon TEXT,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.4 accounts
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,            -- cash | bank | e-wallet
  balance INTEGER NOT NULL DEFAULT 0,  -- dalam rupiah
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.5 transactions
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT REFERENCES categories(id),
  account_id TEXT REFERENCES accounts(id),
  amount INTEGER NOT NULL,       -- dalam rupiah
  type TEXT NOT NULL,            -- in | out
  date TEXT NOT NULL,            -- ISO date (YYYY-MM-DD)
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
CREATE INDEX idx_txn_user_date ON transactions(user_id, date);
```

### 3.6 recurring
```sql
CREATE TABLE recurring (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  frequency TEXT NOT NULL,       -- daily | weekly | monthly | yearly
  start_date TEXT NOT NULL,
  end_date TEXT,
  category_id TEXT REFERENCES categories(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.7 bills
```sql
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',  -- unpaid | paid
  paid_at TEXT,
  recurring_id TEXT REFERENCES recurring(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
CREATE INDEX idx_bills_user_due ON bills(user_id, due_date);
```

### 3.8 attendance
```sql
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL,          -- present | absent | late | permission
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.9 attendance_quota
```sql
CREATE TABLE attendance_quota (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  total INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.10 calendar_events
```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  category TEXT,
  member_id TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
CREATE INDEX idx_cal_user_date ON calendar_events(user_id, date);
```

### 3.11 service_asset
```sql
CREATE TABLE service_asset (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,            -- motor | rumah | alat
  purchase_date TEXT,
  warranty_expiry TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.12 service_log
```sql
CREATE TABLE service_log (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES service_asset(id),
  date TEXT NOT NULL,
  description TEXT,
  cost INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.13 notes
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  important INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);
```

### 3.14 audit_log
```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,          -- create | update | delete
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### 3.15 notification_log
```sql
CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,            -- info | warning | danger
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  created_at TEXT NOT NULL,
  void TEXT
);
```

---

## 4. API Endpoints

### 4.1 Auth
| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/api/auth/register` | publik | `{ username, password, nama }` → `{ user }` |
| POST | `/api/auth/login` | publik | `{ username, password }` → `{ token, user }` + set cookie |
| POST | `/api/auth/logout` | login | Clear cookie |
| GET | `/api/auth/me` | login | → `{ user }` |

### 4.2 CRUD per Modul (pola seragam)
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/{modul}?filter` | List (query params) |
| POST | `/api/{modul}` | Create |
| GET | `/api/{modul}/:id` | Detail |
| PUT | `/api/{modul}/:id` | Update |
| DELETE | `/api/{modul}/:id` | Soft delete |

**Modul:** `txn`, `bill`, `categories`, `settings`, `rec`, `att`, `cal`, `svc`, `note`, `review`, `dash`, `audit`

### 4.3 Response Format
```json
// Sukses
{ "ok": true, "data": { }, "error": null }

// Error
{ "ok": false, "data": null, "error": { "code": "FORBIDDEN", "message": "..." } }
```

### 4.4 Error Codes
| Code | HTTP | Kapan |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Token tidak ada / invalid / expired |
| `FORBIDDEN` | 403 | Tidak punya akses (bukan admin) |
| `VALIDATION` | 400 | Field tidak valid / kurang |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `CONFLICT` | 409 | Duplikat (username, unique constraint) |
| `SERVER` | 500 | Error internal |

---

## 5. Auth & Security

- **Password:** bcryptjs (cost factor 12)
- **Token:** JWT HS256, payload `{ userId, role }`, expiry 7 hari
- **Cookie:** `token=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`
- **CORS:** `Access-Control-Allow-Origin: https://app.baytmustaqbal.my.id`, `Allow-Credentials: true`, `Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`, `Allow-Headers: Content-Type, Authorization`
- **Rate limiting:** (opsional, nanti)

---

## 6. Cron & Notifikasi WA

### Cron (wrangler.toml `[triggers.crons]`, UTC)
| Tujuan | WIB | UTC (cron expr) | Tugas |
|---|---|---|---|
| Digest harian | 07:00 WIB | `0 0 * * *` | Ringkasan harian via WA |
| Bill reminder | tiap jam | `0 * * * *` | Cek tagihan jatuh tempo |
| Generate bulanan | tgl 1, 00:30 WIB | `30 17 * * *` | Generate tagihan dari recurring (Worker check `date === 1`) |

### Notifikasi WA (Fonnte)
- **API:** `POST https://api.fonnte.com/send`
- **Body:** `{ target, message, countryCode: "62" }`
- **Header:** `Authorization: <FONNTE_TOKEN>`
- **Trigger:** cron (digest, reminder) + event (tambah/ubah/hapus)
- **Secret:** `FONNTE_TOKEN`, `FONNTE_TARGET` (group ID), `FONNTE_DEVICE`

---

## 7. Testing & Deploy

### Testing
- **Local dev:** `wrangler dev --local` (miniflare + D1 local)
- **Unit test:** budget logic (50/30/20), validation
- **Integration test:** endpoint test via curl / vitest

### Migrations
- `worker/migrations/0001_initial_schema.sql` — 15 tabel
- `worker/migrations/0002_seed.sql` — (opsional, minimal users admin)
- Jalankan: `wrangler d1 execute bayt-mustaqbal-db --file=worker/migrations/0001_initial_schema.sql`

### Secrets
- `JWT_SECRET` — generate acak ≥ 32 karakter
- `FONNTE_TOKEN` — dari dashboard fonnte
- `FONNTE_TARGET` — group ID WA
- `FONNTE_DEVICE` — default / device ID
- Set via: `wrangler secret put <NAMA>` — **jangan masuk repo**

### Deploy
- Worker: `wrangler deploy`
- D1: `wrangler d1 execute bayt-mustaqbal-db --file=...`
- DNS: CNAME `api.baytmustaqbal.my.id` → Worker (sudah dibuat)

---

## 8. Keputusan Kunci

| ID | Keputusan | Catatan |
|---|---|---|
| D1 | Kakang = admin, Istri = user | tetap berlaku |
| D2 | Satu web app + navigasi tab | ✅ app sekarang: satu halaman, 5 section |
| D3 | WA saja (Fonnte), tanpa email | tetap berlaku |
| D4 | Google Sheets → D1 | tetap berlaku |
| D5 | Satu tabel `calendar_events` + kategori | tetap berlaku |
| D6 | `recurring` ≠ `bills` ≠ `transactions` | tetap berlaku — inti integritas data |
| D7 | Frontend React 18 + Vite + Tailwind | ✅ sudah jalan |
| D8 | Plus Jakarta Sans | ✅ sudah jalan |
| D9 | Edit hanya dalam 24 jam | tetap berlaku (belum diimplementasi) |
| D10 | Dua versi deploy (dev/prod) | preview + produksi Cloudflare |
| D11 | Rekening aktif sejak Fase 1 | tetap berlaku |
| D12 | Tanpa upload foto | tetap berlaku |
| D13 | Tagihan variabel = estimasi + edit saat bayar | tetap berlaku |
| D14 | Hari libur hardcode di settings | tetap berlaku |
| D15 | WA saja via Fonnte | tetap berlaku |
| D16 | Iuran sampah = tipe tagihan khusus + reminder jam | tetap berlaku |
| **D17** | **Origin API: `api.baytmustaqbal.my.id`** | **BARU — subdomain, CORS explicit** |
| **D18** | **Seed: mulai dari 0 (tidak ada mockData)** | **BARU — data kosong, users via register** |
| **D19** | **Scope: semua modul sekaligus** | **BARU — 15 tabel, semua endpoint** |
| **D20** | **Google Calendar sync: tunda** | **BARU — catat untuk reminder** |

---

## 9. Struktur File

```
bayt-mustaqbal-app/
├── worker/
│   ├── src/
│   │   ├── index.ts            # Entry point + routing
│   │   ├── cron.ts             # Scheduled jobs
│   │   ├── routes/
│   │   │   ├── auth.ts         # register, login, logout, me
│   │   │   ├── txn.ts          # transactions
│   │   │   ├── bill.ts         # bills
│   │   │   ├── categories.ts   # categories
│   │   │   ├── settings.ts     # settings
│   │   │   ├── rec.ts          # recurring
│   │   │   ├── att.ts          # attendance
│   │   │   ├── cal.ts          # calendar_events
│   │   │   ├── svc.ts          # service_asset + service_log
│   │   │   ├── note.ts         # notes
│   │   │   ├── review.ts       # review/grafik
│   │   │   ├── dash.ts         # dashboard
│   │   │   └── audit.ts        # audit_log
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verification
│   │   │   └── cors.ts         # CORS headers
│   │   ├── utils/
│   │   │   ├── auth.ts         # bcrypt, JWT
│   │   │   ├── db.ts           # D1 helper
│   │   │   └── validate.ts     # validation
│   │   └── types/
│   │       └── env.ts          # Binding (DB, secrets)
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   └── 0002_seed.sql       # (opsional)
│   ├── wrangler.toml
│   └── package.json
├── (frontend tetap di root)
└── docs/superpowers/specs/2026-10-19-backend-d1-design.md  # file ini
```

---

## 10. Implementation Order

1. **Migrasi D1** — create 15 tabel
2. **Auth** — register, login, logout, me + middleware
3. **CRUD modul** — txn, bill, categories, settings, rec, att, cal, svc, note, review, dash, audit
4. **Cron** — digest, reminder, generate bulanan
5. **Notifikasi WA** — Fonnte integration
6. **Testing** — local dev + integration test
7. **Deploy** — production

---

*Spec written: 2026-10-19. Review sebelum implementasi.*
