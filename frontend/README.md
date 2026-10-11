# Bayt Mustaqbal - Frontend

React + TypeScript + Vite frontend untuk aplikasi keluarga Bayt Mustaqbal.

## Struktur

```
frontend/
├── src/
│   ├── App.tsx              # Routing + Auth init + Protected/Admin routes
│   ├── main.tsx             # Entry point
│   ├── api/client.ts        # API client (fetch wrapper, Bearer token)
│   ├── stores/authStore.ts  # Zustand persist (token, user, role)
│   ├── components/          # Layout, ProtectedRoute, AdminRoute
│   ├── pages/               # Dashboard, Login, Transactions, Bills, Review, Attendance, Calendar, Service, Notes, Settings
│   ├── stores/              # Zustand stores
│   ├── utils/helpers.ts     # Formatters, date, rupiah, debounce
│   └── styles.css           # Design system (dark mode, mobile-first)
├── public/manifest.json     # PWA manifest
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173` → proxy `/api/*` ke Worker `http://localhost:8787`

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | DashboardPage | Ringkasan saldo, budget, tagihan, agenda, absensi, service |
| `/login` | LoginPage | Login email/password |
| `/keuangan` | TransactionsPage | Input cepat grid kategori, filter, pagination |
| `/review` | ReviewPage | Budget vs realisasi, charts, prediksi |
| `/tagihan` | BillsPage | Grouped by status, cicilan, bayar 1 klik, generate |
| `/absensi` | AttendancePage | Kalender grid, quick input, quota cuti |
| `/kalender` | CalendarPage | Month/Agenda view, filter kategori |
| `/service` | ServicePage | Aset motor/rumah, riwayat, due summary |
| `/catatan` | NotesPage | Grid, pin, search, kategori |
| `/settings` | SettingsPage | Admin: kategori, users, Fonnte, maintenance |

## State Management

- **Zustand** untuk auth state (token, user, role) dengan persist ke localStorage
- **React hooks** untuk local component state
- **Tanpa React Query** - fetch manual via API client

## API Client

`src/api/client.ts` - Wrapper fetch dengan:
- Auto attach Bearer token
- Auto redirect ke `/login` kalau 401
- Promise-based, error handling terpusat
- Method mapping: `api.txn.list()`, `api.bill.pay()`, dll

## Styling

- **Custom CSS** dengan CSS Variables (design tokens)
- **Dark mode ready** (prefers-color-scheme)
- **Mobile-first** responsive
- **No framework** - pure CSS, lightweight

## Components

| Component | Description |
|-----------|-------------|
| `Layout` | Sidebar + Topbar + Protected routes |
| `ProtectedRoute` | Redirect ke login kalau belum auth |
| `AdminRoute` | Hanya untuk role admin |
| `Modal` | Reusable modal dengan focus trap |
| `Toast` | Success/error/warning/info notifications |
| `Table` | Reusable table dengan sorting/pagination |
| `Form` | Input, select, checkbox, toggle, date picker |

## Build & Deploy

```bash
# Development
npm run dev

# Production build
npm run build
# Output di ./dist

# Preview build
npm run preview
```

## Deploy ke Cloudflare Pages

1. Push ke GitHub
2. Cloudflare Pages → Create project → Connect GitHub repo
3. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `frontend`
4. Environment variables:
   - `VITE_API_BASE` = `/api` (default)
5. Custom domain: `app.baytmustaqbal.my.id` (Proxy ON)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `/api` | Base URL untuk API calls |

## PWA Support

- `manifest.json` di `public/`
- Service worker bisa ditambahkan via `vite-plugin-pwa`
- Installable di mobile/desktop

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router 6 |
| State | Zustand |
| Charts | Chart.js + react-chartjs-2 |
| Date | date-fns |
| Icons | Inline SVG (no external deps) |
| CSS | Custom CSS Variables |

## Project Structure Details

```
src/
├── api/
│   └── client.ts          # API client singleton
├── components/
│   ├── Layout.tsx         # Main layout + sidebar
│   ├── ProtectedRoute.tsx # Auth guard
│   └── AdminRoute.tsx     # Admin-only guard
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── ReviewPage.tsx
│   ├── BillsPage.tsx
│   ├── AttendancePage.tsx
│   ├── CalendarPage.tsx
│   ├── ServicePage.tsx
│   ├── NotesPage.tsx
│   └── SettingsPage.tsx
├── stores/
│   └── authStore.ts       # Zustand auth state
├── utils/
│   └── helpers.ts         # formatRupiah, formatDate, debounce, etc.
├── styles.css             # Global styles + design tokens
├── App.tsx                # Routing + providers
└── main.tsx               # Entry point
```

## Development Tips

### Hot Module Replacement
Vite HMR aktif untuk React - perubahan component langsung update tanpa reload.

### Proxy API
`vite.config.ts` sudah konfigurasi proxy `/api/*` → `http://localhost:8787` (Worker dev server).

### Type Safety
- Strict TypeScript enabled
- API response types di `worker/src/types/env.ts` (shared via manual sync)
- Zod validation di backend, TypeScript di frontend

### Debugging
- React DevTools untuk component tree
- Network tab untuk API calls
- Console.log di Worker visible di `wrangler dev` output